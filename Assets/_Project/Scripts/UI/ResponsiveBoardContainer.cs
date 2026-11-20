using UnityEngine;

namespace GridShift.UI
{
    /// <summary>
    /// Mantem o tabuleiro em proporcao estrita 1:1 e limita seu tamanho a no maximo
    /// 85% da menor dimensao disponivel (seja largura em celulares ou altura no iPad).
    /// </summary>
    [RequireComponent(typeof(RectTransform))]
    [ExecuteAlways]
    public class ResponsiveBoardContainer : MonoBehaviour
    {
        [Header("Configuracao de Dimensoes")]
        [Tooltip("Porcentagem maxima da menor dimensao permitida (0.85 = 85%).")]
        [Range(0.5f, 1.0f)]
        [SerializeField] private float maxDimensionPercentage = 0.85f;

        [Tooltip("Area de referencia (opcional). Se nulo, utiliza o RectTransform pai.")]
        [SerializeField] private RectTransform referenceArea;

        private RectTransform _rectTransform;
        private RectTransform _parentRectTransform;
        private Vector2 _lastSize = Vector2.zero;

        public float CurrentBoardSize => _rectTransform != null ? _rectTransform.sizeDelta.x : 0f;

        private void Awake()
        {
            _rectTransform = GetComponent<RectTransform>();
            CacheParent();
            UpdateLayout();
        }

        private void Update()
        {
            RectTransform target = referenceArea != null ? referenceArea : _parentRectTransform;
            if (target == null)
            {
                CacheParent();
                target = _parentRectTransform;
            }

            if (target != null)
            {
                Vector2 currentSize = target.rect.size;
                if (currentSize != _lastSize)
                {
                    UpdateLayout();
                }
            }
        }

        private void CacheParent()
        {
            if (transform.parent != null)
            {
                _parentRectTransform = transform.parent.GetComponent<RectTransform>();
            }
        }

        public void UpdateLayout()
        {
            if (_rectTransform == null)
            {
                _rectTransform = GetComponent<RectTransform>();
            }

            RectTransform target = referenceArea != null ? referenceArea : _parentRectTransform;
            if (target == null) return;

            Rect rect = target.rect;
            float availableWidth = Mathf.Abs(rect.width);
            float availableHeight = Mathf.Abs(rect.height);

            if (availableWidth <= 0f || availableHeight <= 0f) return;

            float minDimension = Mathf.Min(availableWidth, availableHeight);
            float targetSide = minDimension * maxDimensionPercentage;

            // Ancoras no centro para manter formato 1:1 independente de redimensionamentos
            _rectTransform.anchorMin = new Vector2(0.5f, 0.5f);
            _rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            _rectTransform.pivot = new Vector2(0.5f, 0.5f);
            _rectTransform.sizeDelta = new Vector2(targetSide, targetSide);
            _rectTransform.anchoredPosition = Vector2.zero;

            _lastSize = new Vector2(availableWidth, availableHeight);
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            UpdateLayout();
        }
#endif
    }
}
