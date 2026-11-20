using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GridController : MonoBehaviour
{
    [Header("Grade e Prefab")]
    [Range(3, 6)] [SerializeField] private int gridSize = 5;
    [SerializeField] private RectTransform boardContainer;
    [SerializeField] private TileView tilePrefab;

    [Header("Espacamento e Animacao")]
    [Range(0f, 0.25f)] [SerializeField] private float gapRatio = 0.06f;
    [SerializeField] private float slideDuration = 0.12f;
    [SerializeField] private float shuffleStepDelay = 0.015f;
    [SerializeField] private int baseShuffleSteps = 20;

    public event Action OnMoveCompleted;
    public event Action OnPuzzleSolved;
    public event Action<int> OnGridInitialized;

    public int GridSize => gridSize;
    public bool IsBusy => isBusy;
    public bool IsSolved => isSolved;

    private TileView[,] grid;
    private Vector2Int emptySlot;
    private Vector2Int lastEmptySlot;
    private float cellStep;
    private Vector2 tileSize;
    private bool isBusy;
    private bool isSolved;

    private Coroutine shuffleRoutine;
    private readonly List<Vector2Int> neighborCandidates = new List<Vector2Int>(4);
    private readonly Vector2Int[] cardinalDirections =
    {
        Vector2Int.up,
        Vector2Int.down,
        Vector2Int.left,
        Vector2Int.right
    };

    void Awake()
    {
        if (boardContainer == null)
            boardContainer = GetComponent<RectTransform>();
    }

    void Start()
    {
        StartNewGame(gridSize);
    }

    public void StartNewGame(int newSize)
    {
        gridSize = Mathf.Clamp(newSize, 3, 6);
        isSolved = false;

        if (shuffleRoutine != null)
        {
            StopCoroutine(shuffleRoutine);
            shuffleRoutine = null;
        }

        Canvas.ForceUpdateCanvases();
        RebuildBoard();
        OnGridInitialized?.Invoke(gridSize);

        int totalSteps = gridSize * baseShuffleSteps;
        shuffleRoutine = StartCoroutine(ShuffleBoardRoutine(totalSteps));
    }

    public void RestartCurrentGame()
    {
        StartNewGame(gridSize);
    }

    private void RebuildBoard()
    {
        ClearExistingTiles();

        grid = new TileView[gridSize, gridSize];
        float boardWidth = boardContainer.rect.width;
        if (boardWidth <= 0f)
            boardWidth = 800f;

        cellStep = boardWidth / gridSize;
        float usableSize = cellStep * (1f - gapRatio);
        tileSize = new Vector2(usableSize, usableSize);

        int tileValue = 1;
        for (int y = 0; y < gridSize; y++)
        {
            for (int x = 0; x < gridSize; x++)
            {
                Vector2Int pos = new Vector2Int(x, y);

                if (x == gridSize - 1 && y == gridSize - 1)
                {
                    emptySlot = pos;
                    lastEmptySlot = pos;
                    continue;
                }

                TileView tile = Instantiate(tilePrefab, boardContainer);
                tile.name = $"Tile_{tileValue:00}";
                tile.SetSize(tileSize);
                tile.SetPositionImmediate(pos, GridToAnchoredPosition(pos));
                tile.Initialize(tileValue, pos, HandleTileClicked);

                grid[x, y] = tile;
                tileValue++;
            }
        }
    }

    private void ClearExistingTiles()
    {
        if (grid != null)
        {
            int width = grid.GetLength(0);
            int height = grid.GetLength(1);
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    if (grid[x, y] != null)
                        Destroy(grid[x, y].gameObject);
                }
            }
        }
    }

    private void HandleTileClicked(TileView clickedTile)
    {
        if (isBusy || isSolved || clickedTile == null)
            return;

        Vector2Int currentPos = clickedTile.GridPosition;
        if (!IsAdjacentToEmpty(currentPos))
            return;

        SwapTileWithEmpty(clickedTile, currentPos, slideDuration);
        OnMoveCompleted?.Invoke();

        if (CheckSolvedState())
        {
            isSolved = true;
            OnPuzzleSolved?.Invoke();
        }
    }

    private bool IsAdjacentToEmpty(Vector2Int pos)
    {
        int dx = Mathf.Abs(pos.x - emptySlot.x);
        int dy = Mathf.Abs(pos.y - emptySlot.y);
        return (dx + dy) == 1;
    }

    private void SwapTileWithEmpty(TileView tile, Vector2Int tileOldPos, float duration)
    {
        Vector2Int targetSlot = emptySlot;

        grid[targetSlot.x, targetSlot.y] = tile;
        grid[tileOldPos.x, tileOldPos.y] = null;

        lastEmptySlot = emptySlot;
        emptySlot = tileOldPos;

        tile.MoveTo(targetSlot, GridToAnchoredPosition(targetSlot), duration);
    }

    private IEnumerator ShuffleBoardRoutine(int steps)
    {
        isBusy = true;
        WaitForSeconds wait = shuffleStepDelay > 0f ? new WaitForSeconds(shuffleStepDelay) : null;

        for (int i = 0; i < steps; i++)
        {
            CollectShuffleCandidates();

            if (neighborCandidates.Count > 0)
            {
                int index = UnityEngine.Random.Range(0, neighborCandidates.Count);
                Vector2Int chosenPos = neighborCandidates[index];
                TileView chosenTile = grid[chosenPos.x, chosenPos.y];

                if (chosenTile != null)
                    SwapTileWithEmpty(chosenTile, chosenPos, Mathf.Min(slideDuration, shuffleStepDelay));
            }

            if (wait != null)
                yield return wait;
        }

        if (CheckSolvedState())
        {
            CollectShuffleCandidates();
            if (neighborCandidates.Count > 0)
            {
                Vector2Int fallbackPos = neighborCandidates[0];
                TileView fallbackTile = grid[fallbackPos.x, fallbackPos.y];
                if (fallbackTile != null)
                    SwapTileWithEmpty(fallbackTile, fallbackPos, 0f);
            }
        }

        isBusy = false;
        shuffleRoutine = null;
    }

    private void CollectShuffleCandidates()
    {
        neighborCandidates.Clear();

        for (int i = 0; i < cardinalDirections.Length; i++)
        {
            Vector2Int candidate = emptySlot + cardinalDirections[i];

            if (candidate.x < 0 || candidate.x >= gridSize || candidate.y < 0 || candidate.y >= gridSize)
                continue;

            if (candidate == lastEmptySlot && neighborCandidates.Count > 0)
                continue;

            if (grid[candidate.x, candidate.y] != null)
                neighborCandidates.Add(candidate);
        }
    }

    private Vector2 GridToAnchoredPosition(Vector2Int pos)
    {
        float offset = ((gridSize - 1) * cellStep) * 0.5f;
        float x = (pos.x * cellStep) - offset;
        float y = offset - (pos.y * cellStep);
        return new Vector2(x, y);
    }

    private bool CheckSolvedState()
    {
        if (emptySlot.x != gridSize - 1 || emptySlot.y != gridSize - 1)
            return false;

        int expectedValue = 1;
        for (int y = 0; y < gridSize; y++)
        {
            for (int x = 0; x < gridSize; x++)
            {
                if (x == gridSize - 1 && y == gridSize - 1)
                    return true;

                TileView tile = grid[x, y];
                if (tile == null || tile.Value != expectedValue)
                    return false;

                expectedValue++;
            }
        }

        return true;
    }

#if UNITY_EDITOR
    public void SetTilePrefab(TileView prefab)
    {
        tilePrefab = prefab;
    }
#endif
}
