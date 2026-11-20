# GridShift - Documentação da Fase 2: Mecânica Central e Embaralhamento

Este documento descreve a implementação da **Fase 2**: renderização de peças (`TileView.cs`), movimentação suave com `SmoothStep`, lógica matricial e embaralhamento 100% solvável (`GridController.cs`), além da integração com a hierarquia da Fase 1.

---

## 1. Componentes Implementados

### A. `TileView.cs` (`Assets/_Project/Scripts/UI/TileView.cs`)
* Renderiza a peça com `TextMeshProUGUI` (`numberLabel`) e `Image` (`tileBackground`).
* Trata o clique através do componente nativo `Button` sem alocações no loop principal.
* Executa animação suave de deslizamento via corrotina (`SmoothStep`), desativando-se automaticamente ao atingir o destino (sem overhead de `Update()` por peça).
* Suporta atualização imediata de posição (`SetPositionImmediate`) para montagem inicial e embaralhamento rápido.

### B. `GridController.cs` (`Assets/_Project/Scripts/Core/GridController.cs`)
* Gerencia a matriz lógica `TileView[,] grid` e rastreia o espaço vazio (`emptySlot`).
* **Cálculo de Coordenadas:** Converte posições de grade `(x, y)` para coordenadas ancoradas relativas ao centro do `BoardContainer` (`GridToAnchoredPosition`), mantendo o tabuleiro perfeitamente centralizado.
* **Validação de Adjacência:** Permite movimento apenas se `|dx| + |dy| == 1` em relação ao `emptySlot`.
* **Embaralhamento 100% Solvável:** Realiza uma série de trocas reversas válidas partindo do estado resolvido, ignorando o movimento inverso imediato e garantindo que o tabuleiro não nasça resolvido.
* **Eventos para a Fase 3:**
  * `OnGridInitialized(int gridSize)`: Notifica o tamanho da grade (3, 4 ou 5) para atualizar a UI.
  * `OnMoveCompleted`: Disparado a cada movimento válido do jogador (alimenta o contador de passos e SFX/Haptics).
  * `OnPuzzleSolved`: Disparado quando a matriz atinge a ordem sequencial correta com o espaço vazio no canto inferior direito.

---

## 2. Compatibilidade com a Hierarquia da Fase 1

Na Fase 1, o `BoardContainer` recebeu o script `ResponsiveBoardContainer.cs`, que garante proporção 1:1 e restrição de até 85% da menor dimensão da tela.

* **Integração:** O `GridController` é anexado diretamente ao mesmo GameObject `BoardContainer`.
* **Sincronização de Tamanho:** Ao chamar `StartNewGame()`, o `GridController` executa `Canvas.ForceUpdateCanvases()`, garantindo que `boardContainer.rect.width` já esteja calculado pelo `ResponsiveBoardContainer` antes de instanciar os tiles.

---

## 3. Montagem do `Tile.prefab` no Unity

Você pode gerar o prefab de duas formas:

### Opção 1: Automática (1 Clique via Menu)
1. No Unity, abra o menu superior: `Tools > GridShift > 3. Gerar Prefab do Tile (Fase 2)`.
2. O prefab será criado automaticamente em `Assets/_Project/Prefabs/Tiles/Tile.prefab` com o design base slate escuro, textos auto-ajustáveis e referências conectadas.
3. Se já houver um `GridController` na cena, ele será automaticamente vinculado ao prefab.

### Opção 2: Manual
1. Na cena, dentro do `BoardContainer`, crie um `UI > Button - TextMeshPro` e renomeie para `Tile`.
2. Adicione o componente `TileView` ao objeto raiz `Tile`.
3. Arraste a `Image` do objeto raiz para o campo **Tile Background**.
4. Arraste o filho `Text (TMP)` para o campo **Number Label**.
5. No `Text (TMP)`, configure:
   * Alinhamento: Centralizado horizontal e verticalmente.
   * Auto Sizing: Marcado (Mínimo: 20, Máximo: 72).
   * Estilo: Negrito (Bold).
6. Arraste o objeto `Tile` da hierarquia para a pasta `Assets/_Project/Prefabs/Tiles/` no painel Project.
7. Exclua a instância de `Tile` da cena.
8. Selecione `BoardContainer` e arraste o prefab criado para o campo **Tile Prefab** do `GridController`.

---

## 4. Testes no Unity Editor e iPad

1. No `GridController`, teste alterar o campo **Grid Size** para `3`, `4` ou `5`.
2. Dê **Play** no Editor ou conecte o iPad via **Unity Remote 5**:
   * O tabuleiro será montado e embaralhado com animações rápidas.
   * Toque em peças vizinhas ao espaço vazio para testar o deslizamento suave.
   * Toque em peças não adjacentes para confirmar que não se movem.
3. Teste em diferentes resoluções na janela Game (`1080x1920`, `1080x2400` e `4:3 iPad`) para validar a responsividade contínua.
