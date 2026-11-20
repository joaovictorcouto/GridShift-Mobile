using System;
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(RectTransform), typeof(Button))]
public class TileView : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI numberLabel;
    [SerializeField] private Image tileBackground;

    public int Value { get; private set; }
    public Vector2Int GridPosition { get; private set; }

    private RectTransform rectTransform;
    private Button button;
    private Coroutine moveRoutine;
    private Action<TileView> onTileClicked;

    void Awake()
    {
        rectTransform = (RectTransform)transform;
        button = GetComponent<Button>();
        button.onClick.AddListener(HandleClick);
    }

    void OnDestroy()
    {
        if (button != null)
            button.onClick.RemoveListener(HandleClick);
    }

    public void Initialize(int value, Vector2Int initialGridPos, Action<TileView> clickCallback)
    {
        Value = value;
        GridPosition = initialGridPos;
        onTileClicked = clickCallback;

        if (numberLabel != null)
            numberLabel.text = value.ToString();
    }

    public void SetSize(Vector2 size)
    {
        rectTransform.sizeDelta = size;
    }

    public void SetPositionImmediate(Vector2Int newGridPos, Vector2 anchoredPos)
    {
        StopActiveMove();
        GridPosition = newGridPos;
        rectTransform.anchoredPosition = anchoredPos;
    }

    public void MoveTo(Vector2Int newGridPos, Vector2 targetAnchoredPos, float duration)
    {
        GridPosition = newGridPos;
        StopActiveMove();

        if (duration <= 0f || !gameObject.activeInHierarchy)
        {
            rectTransform.anchoredPosition = targetAnchoredPos;
            return;
        }

        moveRoutine = StartCoroutine(AnimateMoveRoutine(targetAnchoredPos, duration));
    }

    private void StopActiveMove()
    {
        if (moveRoutine != null)
        {
            StopCoroutine(moveRoutine);
            moveRoutine = null;
        }
    }

    private IEnumerator AnimateMoveRoutine(Vector2 targetPos, float duration)
    {
        Vector2 startPos = rectTransform.anchoredPosition;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            float smoothT = Mathf.SmoothStep(0f, 1f, t);
            rectTransform.anchoredPosition = Vector2.LerpUnclamped(startPos, targetPos, smoothT);
            yield return null;
        }

        rectTransform.anchoredPosition = targetPos;
        moveRoutine = null;
    }

    private void HandleClick()
    {
        onTileClicked?.Invoke(this);
    }

#if UNITY_EDITOR
    public void SetReferences(TextMeshProUGUI label, Image background)
    {
        numberLabel = label;
        tileBackground = background;
    }
#endif
}
