# GridShift - Documentação da Fase 1

Este documento descreve a configuração da **Fase 1**: estrutura de pastas, configuração do Canvas Scaler, tratamento de Safe Area e conteinerização responsiva do tabuleiro (1:1).

---

## 1. Repositório e Estrutura de Pastas

* **Repositório GitHub:** `https://github.com/joaovictorcouto/GridShift-Mobile`
* **Árvore de Pastas (`Assets/_Project`):**
  * `Animations/`
  * `Audio/Music/` e `Audio/SFX/`
  * `Fonts/`
  * `Materials/`
  * `Prefabs/UI/` e `Prefabs/Tiles/`
  * `Scenes/`
  * `Scripts/Core/`, `Scripts/Audio/`, `Scripts/Input/`, `Scripts/UI/` e `Scripts/Editor/`
  * `Sprites/Common/` e `Sprites/Themes/`

---

## 2. Configuração Exata do Canvas Scaler

Ao criar ou configurar o Canvas raiz da cena no Unity:

| Propriedade | Valor Recomendado |
|---|---|
| **Render Mode** | `Screen Space - Overlay` |
| **UI Scale Mode** | `Scale With Screen Size` |
| **Reference Resolution** | `X = 1080`, `Y = 1920` |
| **Screen Match Mode** | `Match Width Or Height` |
| **Match** | `0.5` (Equilíbrio exato entre largura e altura) |
| **Reference Pixels Per Unit** | `100` |

---

## 3. Scripts Entregues

### A. `SafeAreaFitter.cs` (`Assets/_Project/Scripts/UI/SafeAreaFitter.cs`)
* Obtém `Screen.safeArea` normalizado em relação a `Screen.width` e `Screen.height`.
* Aplica dinamicamente em `RectTransform.anchorMin` e `RectTransform.anchorMax`.
* Monitora alterações em tempo de execução e no Editor (`ExecuteAlways`), adaptando-se a rotações e entalhes de iPhone/iPad e Android.

### B. `ResponsiveBoardContainer.cs` (`Assets/_Project/Scripts/UI/ResponsiveBoardContainer.cs`)
* Garante proporção estrita de **1:1** (`sizeDelta = (side, side)`).
* Calcula `side = min(availableWidth, availableHeight) * maxDimensionPercentage` (padrão de 0.85 = 85%).
* No celular (proporções 19.5:9 a 20:9), a menor dimensão é a largura.
* No iPad (proporção 4:3), a altura disponível no miolo da tela se torna o fator limitante. O componente recalcula automaticamente para que o tabuleiro nunca sobreponha o cabeçalho nem o rodapé.

### C. `ProjectSetupTools.cs` (`Assets/_Project/Scripts/Editor/ProjectSetupTools.cs`)
Adiciona ao menu superior do Unity:
* `Tools > GridShift > 1. Recriar Pastas do Projeto`: Garante a existência de todas as pastas padrão.
* `Tools > GridShift > 2. Gerar Estrutura de UI Canvas (Fase 1)`: Monta com 1 clique a hierarquia completa:
  ```text
  Canvas (com CanvasScaler 1080x1920, Match 0.5)
  └── SafeArea (com SafeAreaFitter)
      ├── HeaderPanel (Topo: tempo, movimentos, título)
      ├── DifficultyPanel (Abas 3x3, 4x4, 5x5)
      ├── BoardArea (Área central flexível)
      │   └── BoardContainer (1:1 com ResponsiveBoardContainer 85%)
      └── FooterPanel (Rodapé: botões de ação e som)
  ```

---

## 4. Testes no iPad via Unity Remote 5 (Windows)

1. No iPad, abra o **Unity Remote 5**.
2. Conecte o iPad ao PC via USB-C (certifique-se de que o Windows reconhece o dispositivo via iTunes ou Apple Devices).
3. No Unity Editor: `Edit > Project Settings > Editor > Device: Any iOS Device`.
4. Entre no modo Play no Unity. O jogo será espelhado no iPad com suporte total a toques na tela.
