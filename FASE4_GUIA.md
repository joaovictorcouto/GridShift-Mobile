# GridShift - Documentação da Fase 4: Áudio Tátil, Vibração Háptica e Modal de Vitória

Este documento descreve a implementação da **Fase 4**: áudio tátil dinâmico (`AudioManager.cs`), vibração nativa mobile (`HapticFeedback.cs`), persistência de recordes (`SaveSystem.cs`) e tela modal de celebração de vitória (`VictoryModalController.cs`).

---

## 1. Componentes e Sistemas Implementados

### A. `HapticFeedback.cs` (`Assets/_Project/Scripts/Input/HapticFeedback.cs`)
* Dispara vibrações curtas nativas via `Handheld.Vibrate()` no Android e iOS/iPadOS.
* Possui cooldown de proteção (`minInterval = 0.05f`) para evitar sobrecarga ou saturação do motor de vibração em toques sequenciais rápidos.
* Suporta desativação global via `SetEnabled(false)`.

### B. `AudioManager.cs` (`Assets/_Project/Scripts/Audio/AudioManager.cs`)
* **Deslizamento Orgânico:** Em cada deslizamento de peça (`PlaySlideSound`), o pitch é sutilmente alterado entre `0.97f` e `1.03f`, evitando efeito sonoro robótico e cansativo.
* **Celebração:** Som distinto em `PlayVictorySound` ao completar o quebra-cabeça.
* **Controle de Mudo:** Métodos `ToggleMute()` e `SetMuted(bool)` integrados ao componente de áudio.

### C. `SaveSystem.cs` (`Assets/_Project/Scripts/Core/SaveSystem.cs`)
* Persistência de melhores tempos (em segundos) e menor número de movimentos usando `PlayerPrefs` com chaves parametrizadas por tamanho (`3x3`, `4x4`, `5x5`).
* Avalia e retorna flags `out bool isNewBestTime` e `out bool isNewBestMoves` para destacar novos recordes na interface.

### D. `VictoryModalController.cs` (`Assets/_Project/Scripts/UI/VictoryModalController.cs`)
* **Loop de Feedback:**
  * Escuta `gridController.OnMoveCompleted` para disparar som de slide e vibração leve a cada jogada.
  * Escuta `gridController.OnPuzzleSolved` para:
    1. Tocar áudio de vitória e vibração festiva.
    2. Ler estatísticas do `UIManager` (`CurrentGridSize`, `ElapsedSeconds`, `MoveCount`).
    3. Salvar o recorde no `SaveSystem`.
    4. Exibir o modal com tempo formatado (`mm:ss`), quantidade de movimentos e destaque caso seja novo recorde.
* **Reinício Direto:** O botão "JOGAR NOVAMENTE" fecha o modal e dispara imediatamente um novo embaralhamento na mesma dificuldade.

---

## 2. Montagem e Vinculação na Cena

### Opção 1: Automática (1 Clique via Menu)
1. No Unity Editor, clique em:
   `Tools > GridShift > 4. Executar Setup Completo (Fases 1 a 4)`
2. O script configura automaticamente:
   * A hierarquia da `TopHUD` e `BoardContainer`.
   * O painel `VictoryModal` dentro de `SafeArea` (com overlay translúcido, card central, textos e botão).
   * O GameObject raiz `Systems` com `AudioManager` (e `AudioSource`), `HapticFeedback` e `VictoryModalController`, conectando todas as referências cruzadas.

### Opção 2: Montagem Manual
1. Na raiz da cena, crie um GameObject vazio chamado `Systems`.
2. Adicione os componentes:
   * `AudioSource` (desmarque *Play On Awake* e *Loop*).
   * `AudioManager` (vincule clipes de som para *Slide Clip* e *Victory Clip*).
   * `HapticFeedback`.
   * `VictoryModalController`.
3. Crie o painel `VictoryModal` sob o GameObject `SafeArea`, com um card central contendo:
   * `FinalTimeText` (`TextMeshProUGUI`)
   * `FinalMovesText` (`TextMeshProUGUI`)
   * `BestRecordText` (`TextMeshProUGUI`)
   * `PlayAgainButton` (`Button`)
4. Arraste as referências de `GridController`, `UIManager`, `AudioManager`, `HapticFeedback` e os elementos de UI para os campos correspondentes no `VictoryModalController`.

---

## 3. Testes no Editor e no iPad

1. **Deslizamento com Resposta Sensorial:**
   * Mova as peças pelo iPad (via Unity Remote) ou Editor: verifique a variação suave de pitch do clique sonoro e a resposta háptica no tablet.
2. **Resolução e Vitória:**
   * Ao resolver o quebra-cabeça, verifique a ativação do som de vitória, abertura do `VictoryModal` e apresentação do tempo e movimentos.
3. **Persistência de Recordes:**
   * Complete uma partida, observe o registro do recorde. Complete outra partida mais rápida e confirme a tag `"• NOVO RECORDE!"`.
4. **Ciclo de Partidas:**
   * Clique em "JOGAR NOVAMENTE" e confirme que o modal fecha, a grade embaralha e o cronômetro reinicia limpo após o embaralhamento.
