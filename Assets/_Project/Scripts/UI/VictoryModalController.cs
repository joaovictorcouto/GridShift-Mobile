using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class VictoryModalController : MonoBehaviour
{
    [Header("Referencias do Jogo")]
    [SerializeField] private GridController gridController;
    [SerializeField] private UIManager uiManager;
    [SerializeField] private AudioManager audioManager;
    [SerializeField] private HapticFeedback hapticFeedback;

    [Header("Elementos do Modal")]
    [SerializeField] private GameObject modalRoot;
    [SerializeField] private TextMeshProUGUI finalTimeText;
    [SerializeField] private TextMeshProUGUI finalMovesText;
    [SerializeField] private TextMeshProUGUI bestRecordText;
    [SerializeField] private Button playAgainButton;

    void Awake()
    {
        if (modalRoot != null)
            modalRoot.SetActive(false);

        if (playAgainButton != null)
            playAgainButton.onClick.AddListener(HandlePlayAgainClicked);
    }

    void OnEnable()
    {
        if (gridController != null)
        {
            gridController.OnMoveCompleted += HandleMoveFeedback;
            gridController.OnPuzzleSolved += HandlePuzzleSolved;
            gridController.OnGridInitialized += HandleGridInitialized;
        }
    }

    void OnDisable()
    {
        if (gridController != null)
        {
            gridController.OnMoveCompleted -= HandleMoveFeedback;
            gridController.OnPuzzleSolved -= HandlePuzzleSolved;
            gridController.OnGridInitialized -= HandleGridInitialized;
        }
    }

    void OnDestroy()
    {
        if (playAgainButton != null)
            playAgainButton.onClick.RemoveListener(HandlePlayAgainClicked);
    }

    private void HandleMoveFeedback()
    {
        audioManager?.PlaySlideSound();
        hapticFeedback?.TriggerLightTap();
    }

    private void HandleGridInitialized(int size)
    {
        if (modalRoot != null)
            modalRoot.SetActive(false);
    }

    private void HandlePuzzleSolved()
    {
        audioManager?.PlayVictorySound();
        hapticFeedback?.TriggerSuccess();

        int gridSize = uiManager != null ? uiManager.CurrentGridSize : 5;
        float elapsed = uiManager != null ? uiManager.ElapsedSeconds : 0f;
        int moves = uiManager != null ? uiManager.MoveCount : 0;

        SaveSystem.TrySaveRecord(gridSize, elapsed, moves, out bool newTime, out bool newMoves);

        if (finalTimeText != null)
            finalTimeText.text = FormatTime(elapsed);

        if (finalMovesText != null)
            finalMovesText.text = $"{moves} movimentos";

        if (bestRecordText != null)
        {
            float bestTime = SaveSystem.GetBestTime(gridSize);
            int bestMoves = SaveSystem.GetBestMoves(gridSize);
            string tag = (newTime || newMoves) ? " • NOVO RECORDE!" : string.Empty;
            bestRecordText.text = $"Recorde {gridSize}x{gridSize}: {FormatTime(bestTime)} / {bestMoves} mov.{tag}";
        }

        if (modalRoot != null)
            modalRoot.SetActive(true);
    }

    private void HandlePlayAgainClicked()
    {
        if (modalRoot != null)
            modalRoot.SetActive(false);

        uiManager?.RestartCurrentGrid();
    }

    private string FormatTime(float secondsValue)
    {
        if (secondsValue < 0f)
            return "--:--";

        int totalSeconds = Mathf.FloorToInt(secondsValue);
        int mins = totalSeconds / 60;
        int secs = totalSeconds % 60;
        return $"{mins:00}:{secs:00}";
    }

#if UNITY_EDITOR
    public void SetReferences(GridController controller, UIManager ui, AudioManager audio, HapticFeedback haptic,
        GameObject root, TextMeshProUGUI timeText, TextMeshProUGUI movesTxt, TextMeshProUGUI bestTxt, Button playAgain)
    {
        gridController = controller;
        uiManager = ui;
        audioManager = audio;
        hapticFeedback = haptic;
        modalRoot = root;
        finalTimeText = timeText;
        finalMovesText = movesTxt;
        bestRecordText = bestTxt;
        playAgainButton = playAgain;
    }
#endif
}
