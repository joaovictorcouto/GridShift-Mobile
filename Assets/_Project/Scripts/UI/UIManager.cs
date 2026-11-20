using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class UIManager : MonoBehaviour
{
    [Header("Referencias do Jogo")]
    [SerializeField] private GridController gridController;

    [Header("HUD Superior")]
    [SerializeField] private TextMeshProUGUI timerText;
    [SerializeField] private TextMeshProUGUI movesText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private Button restartButton;

    [Header("Seletor de Dificuldade")]
    [SerializeField] private Button button3x3;
    [SerializeField] private Button button4x4;
    [SerializeField] private Button button5x5;
    [SerializeField] private Color activeTabColor = new Color(0.95f, 0.42f, 0.31f, 1f);
    [SerializeField] private Color inactiveTabColor = new Color(0.22f, 0.25f, 0.30f, 1f);

    private float elapsedSeconds;
    private int lastDisplayedSecond = -1;
    private int moveCount;
    private int currentGridSize = 5;
    private bool isTimerRunning;

    private Image image3x3;
    private Image image4x4;
    private Image image5x5;

    void Awake()
    {
        if (button3x3 != null) image3x3 = button3x3.GetComponent<Image>();
        if (button4x4 != null) image4x4 = button4x4.GetComponent<Image>();
        if (button5x5 != null) image5x5 = button5x5.GetComponent<Image>();

        RegisterListeners();
    }

    void OnEnable()
    {
        if (gridController == null)
            return;

        gridController.OnGridInitialized += HandleGridInitialized;
        gridController.OnShuffleFinished += HandleShuffleFinished;
        gridController.OnMoveCompleted += HandleMoveCompleted;
        gridController.OnPuzzleSolved += HandlePuzzleSolved;
    }

    void OnDisable()
    {
        if (gridController == null)
            return;

        gridController.OnGridInitialized -= HandleGridInitialized;
        gridController.OnShuffleFinished -= HandleShuffleFinished;
        gridController.OnMoveCompleted -= HandleMoveCompleted;
        gridController.OnPuzzleSolved -= HandlePuzzleSolved;
    }

    void OnDestroy()
    {
        UnregisterListeners();
    }

    void Update()
    {
        if (!isTimerRunning)
            return;

        elapsedSeconds += Time.deltaTime;
        int wholeSeconds = Mathf.FloorToInt(elapsedSeconds);

        if (wholeSeconds != lastDisplayedSecond)
        {
            lastDisplayedSecond = wholeSeconds;
            UpdateTimerLabel(wholeSeconds);
        }
    }

    private void RegisterListeners()
    {
        if (restartButton != null)
            restartButton.onClick.AddListener(RestartCurrentGrid);

        if (button3x3 != null)
            button3x3.onClick.AddListener(() => SelectDifficulty(3));

        if (button4x4 != null)
            button4x4.onClick.AddListener(() => SelectDifficulty(4));

        if (button5x5 != null)
            button5x5.onClick.AddListener(() => SelectDifficulty(5));
    }

    private void UnregisterListeners()
    {
        if (restartButton != null)
            restartButton.onClick.RemoveListener(RestartCurrentGrid);

        if (button3x3 != null)
            button3x3.onClick.RemoveListener(() => SelectDifficulty(3));

        if (button4x4 != null)
            button4x4.onClick.RemoveListener(() => SelectDifficulty(4));

        if (button5x5 != null)
            button5x5.onClick.RemoveListener(() => SelectDifficulty(5));
    }

    public void SelectDifficulty(int size)
    {
        currentGridSize = Mathf.Clamp(size, 3, 6);
        HighlightDifficultyTab(currentGridSize);

        if (gridController != null)
            gridController.StartNewGame(currentGridSize);
    }

    public void RestartCurrentGrid()
    {
        if (gridController != null)
            gridController.StartNewGame(currentGridSize);
    }

    private void HandleGridInitialized(int size)
    {
        currentGridSize = size;
        moveCount = 0;
        elapsedSeconds = 0f;
        lastDisplayedSecond = -1;
        isTimerRunning = false;

        UpdateMovesLabel(0);
        UpdateTimerLabel(0);
        HighlightDifficultyTab(currentGridSize);

        if (statusText != null)
            statusText.text = "EMBARALHANDO...";
    }

    private void HandleShuffleFinished()
    {
        isTimerRunning = true;

        if (statusText != null)
            statusText.text = $"{currentGridSize}X{currentGridSize}";
    }

    private void HandleMoveCompleted()
    {
        moveCount++;
        UpdateMovesLabel(moveCount);
    }

    private void HandlePuzzleSolved()
    {
        isTimerRunning = false;

        if (statusText != null)
            statusText.text = "RESOLVIDO";
    }

    private void UpdateMovesLabel(int count)
    {
        if (movesText != null)
            movesText.text = count.ToString();
    }

    private void UpdateTimerLabel(int totalSeconds)
    {
        if (timerText == null)
            return;

        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        timerText.text = $"{minutes:00}:{seconds:00}";
    }

    private void HighlightDifficultyTab(int selectedSize)
    {
        SetTabColor(image3x3, selectedSize == 3);
        SetTabColor(image4x4, selectedSize == 4);
        SetTabColor(image5x5, selectedSize == 5);
    }

    private void SetTabColor(Image targetImage, bool isSelected)
    {
        if (targetImage != null)
            targetImage.color = isSelected ? activeTabColor : inactiveTabColor;
    }

#if UNITY_EDITOR
    public void SetReferences(GridController controller, TextMeshProUGUI timer, TextMeshProUGUI moves, TextMeshProUGUI status, Button restart, Button b3, Button b4, Button b5)
    {
        gridController = controller;
        timerText = timer;
        movesText = moves;
        statusText = status;
        restartButton = restart;
        button3x3 = b3;
        button4x4 = b4;
        button5x5 = b5;
    }
#endif
}
