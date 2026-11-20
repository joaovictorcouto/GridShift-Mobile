# GridShift - Documentação da Fase 3: HUD e Integração com UIManager

Este documento descreve a implementação da **Fase 3**: conexão da interface visual de jogo (`UIManager.cs`) com a mecânica do `GridController.cs`, cronômetro de baixo custo sem alocação por frame, contador de movimentos e alternador dinâmico de dificuldade (3x3, 4x4, 5x5).

---

## 1. Componentes e Lógica Implementada

### A. `UIManager.cs` (`Assets/_Project/Scripts/UI/UIManager.cs`)
* **Cronômetro Otimizado:** Monitora o tempo com `elapsedSeconds += Time.deltaTime`, mas só executa formatação de string e atualização de texto TMP quando o segundo inteiro muda (`wholeSeconds != lastDisplayedSecond`). Isso elimina alocações e chamadas pesadas ao Canvas a 60/120 Hz.
* **Contador de Movimentos:** Incrementado exclusivamente sob demanda pelo evento `OnMoveCompleted` disparado pelo `GridController`.
* **Seletor de Dificuldade (3x3, 4x4, 5x5):**
  * Atualiza o destaque visual das abas através de `activeTabColor` e `inactiveTabColor`.
  * Reinicia a grade com o novo tamanho através de `gridController.StartNewGame(size)`.
* **Botão de Reiniciar:** Reinicia o tabuleiro na dimensão atual a qualquer momento.

### B. Ajuste de Fluxo com `OnShuffleFinished` (`GridController.cs`)
* Adicionado o evento `public event Action OnShuffleFinished` ao `GridController`.
* Ao iniciar uma nova grade (`StartNewGame`), o status exibe `"EMBARALHANDO..."` e o cronômetro permanece pausado (`isTimerRunning = false`).
* Quando `ShuffleBoardRoutine` conclui o embaralhamento e libera as peças para o jogador (`isBusy = false`), o evento `OnShuffleFinished` é disparado, iniciando a contagem do cronômetro e exibindo a dimensão ativa (ex: `"5X5"`).

---

## 2. Montagem da HUD na Cena

A hierarquia visual pode ser configurada de duas formas:

### Opção 1: Automática (1 Clique via Menu)
1. No Unity Editor, clique em `Tools > GridShift > 2. Gerar Estrutura de UI Canvas (Fases 1, 2 e 3)` ou `Tools > GridShift > 4. Executar Setup Completo (Fase 1, 2 e 3)`.
2. Toda a hierarquia será gerada ou atualizada automaticamente dentro da `SafeArea`:
   ```text
   Canvas (CanvasScaler 1080x1920 Match 0.5)
   └── SafeArea (SafeAreaFitter)
       ├── TopHUD (260px)
       │   ├── DifficultyBar (HorizontalLayoutGroup com Btn_3x3, Btn_4x4, Btn_5x5)
       │   └── StatsRow (HorizontalLayoutGroup)
       │       ├── TimerBlock (Rótulo TEMPO + Texto 00:00)
       │       ├── StatusBadge (Texto 5X5 / EMBARALHANDO... / RESOLVIDO)
       │       ├── MovesBlock (Rótulo MOVIMENTOS + Contador)
       │       └── RestartButton (Botão de reinício ↺)
       ├── BoardArea (Área flexível)
       │   └── BoardContainer (1:1 com ResponsiveBoardContainer + GridController)
       └── FooterPanel (Rodapé)
   
   UIManager (GameObject com todas as referências conectadas automaticamente)
   ```

### Opção 2: Montagem Manual
1. Crie um GameObject vazio na raiz da cena chamado `UIManager`.
2. Anexe o script `UIManager.cs` a ele.
3. No Inspector do `UIManager`:
   * **Grid Controller:** Arraste o `BoardContainer`.
   * **Timer Text:** Arraste o componente `TextMeshProUGUI` do cronômetro.
   * **Moves Text:** Arraste o componente `TextMeshProUGUI` do contador de movimentos.
   * **Status Text:** Arraste o componente `TextMeshProUGUI` do indicador de status/badge.
   * **Restart Button:** Arraste o botão de reinício.
   * **Button 3x3 / 4x4 / 5x5:** Arraste os respectivos botões de dificuldade.

---

## 3. Testes Recomendados no Editor e iPad

1. **Troca de Dificuldade:**
   * Clique em `3x3`, `4x4` e `5x5`. Observe a reconstrução imediata da grade, o embaralhamento automático e o destaque da aba ativa.
2. **Cronômetro:**
   * Confirme que o tempo fica zerado durante o embaralhamento e inicia imediatamente após a liberação do tabuleiro.
3. **Contagem de Movimentos:**
   * Deslize peças adjacentes ao espaço vazio e confirme o incremento exato do contador `MovesText`.
4. **Condição de Vitória:**
   * Resolva o quebra-cabeça (ou simule um estado final) e confirme a interrupção do cronômetro e a mensagem `"RESOLVIDO"`.
5. **Reinício Rápido:**
   * Clique no botão `↺` e verifique o reset do cronômetro e passos.
