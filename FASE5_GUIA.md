# GridShift - Documentação da Fase 5: Automação CI/CD no GitHub Actions

Este documento descreve a implementação da **Fase 5**: esteira automatizada de compilação mobile (CI/CD) para **Android (`.aab` / `.apk`)** e **iOS/iPad (`Xcode Project` / `.ipa`)** via **GitHub Actions** e **GameCI**.

---

## 1. Estrutura de Arquivos Criados

* **Workflow CI/CD:** `.github/workflows/build-mobile.yml`
* **Script de Build do Unity:** `Assets/_Project/Editor/BuildScript.cs`

---

## 2. Como Funciona a Esteira (`build-mobile.yml`)

1. **Gatilhos (`triggers`):**
   * **Push na branch `main`:** Dispara a compilação de ambas as plataformas automaticamente.
   * **Execução manual (`workflow_dispatch`):** Permite acionar no painel do GitHub escolhendo `android`, `ios` ou `all`.
2. **Cache da pasta `Library`:**
   * Utiliza `actions/cache@v4` chaveado pela versão do Unity e hash dos arquivos de `Assets` e `Packages`, reduzindo drasticamente o tempo dos builds subsequentes.
3. **Build Android (Runner Ubuntu):**
   * Executa via GameCI (`game-ci/unity-builder@v4`) no ambiente Linux.
   * Gera o pacote de publicação `GridShift.aab` (Google Play) assinado com a Keystore fornecida via secrets.
   * Publica o artefato para download: `gridshift-android-aab`.
4. **Build iOS/iPad (Runner macOS):**
   * Executa via GameCI no runner `macos-latest`.
   * Invoca `BuildScript.PerformBuild` para exportar o projeto nativo Xcode em `build/iOS/XcodeProject`.
   * Publica o artefato para download: `gridshift-ios-build`.

---

## 3. Configuração de Secrets no GitHub

No repositório do GitHub, acesse **Settings > Secrets and variables > Actions > New repository secret** e adicione:

### A. Licenciamento Unity (GameCI)
* `UNITY_EMAIL`: E-mail da conta Unity.
* `UNITY_PASSWORD`: Senha da conta Unity.
* `UNITY_LICENSE`: Conteúdo do arquivo de licença `.ulf` (para licença pessoal gratuita, gerado via fluxo de ativação manual do GameCI).

### B. Assinatura Android (Keystore)
Para gerar a Keystore localmente no Windows e converter para Base64:
```powershell
# 1. Gerar a Keystore (caso nao possua)
keytool -genkey -v -keystore user.keystore -alias gridshift -keyalg RSA -keysize 2048 -validity 10000

# 2. Converter para Base64 para colar no secret
[Convert]::ToBase64String([IO.File]::ReadAllBytes("user.keystore")) | Set-Clipboard
```
* `ANDROID_KEYSTORE_BASE64`: A string Base64 da Keystore copiada.
* `ANDROID_KEYSTORE_PASS`: Senha da Keystore.
* `ANDROID_KEYALIAS_NAME`: Nome do alias (ex: `gridshift`).
* `ANDROID_KEYALIAS_PASS`: Senha do alias.

---

## 4. Fluxo de Instalação e Teste no iPad

1. **Download do Artefato:** Baixe o arquivo gerado pelo job `build-ios` no GitHub Actions (`gridshift-ios-build.zip`).
2. **Geração do `.ipa` sem Mac:**
   * Caso utilize **Sideloadly** ou **AltStore** no Windows: eles podem compilar e assinar o pacote exportado ou um `.ipa` usando uma conta Apple ID pessoal gratuita (válida por 7 dias renováveis).
3. **Distribuição via Apple Developer (TestFlight / App Store):**
   * Se possuir conta de desenvolvedor paga da Apple, adicione os secrets `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64` para assinar o `.ipa` diretamente no runner macOS via `xcodebuild`.

---

## 5. Ajustes de Versão do Unity

No arquivo `.github/workflows/build-mobile.yml`, a variável `UNITY_VERSION` está definida por padrão como:
```yaml
env:
  UNITY_VERSION: "6000.0.23f1" # Altere para a versao exata instalada na sua maquina (ex: 2022.3.48f1)
```
Mantenha essa versão idêntica à versão do Unity Editor utilizada no desenvolvimento para evitar recompilação de assets.
