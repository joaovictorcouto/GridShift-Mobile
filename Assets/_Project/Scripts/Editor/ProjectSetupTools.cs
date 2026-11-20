#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GridShift.UI;

namespace GridShift.Editor
{
    public static class ProjectSetupTools
    {
        private const string TilePrefabPath = "Assets/_Project/Prefabs/Tiles/Tile.prefab";

        [MenuItem("Tools/GridShift/1. Recriar Pastas do Projeto", false, 1)]
        public static void CreateFolderHierarchy()
        {
            string[] folders = new string[]
            {
                "Assets/_Project/Animations",
                "Assets/_Project/Audio/Music",
                "Assets/_Project/Audio/SFX",
                "Assets/_Project/Fonts",
                "Assets/_Project/Materials",
                "Assets/_Project/Prefabs/UI",
                "Assets/_Project/Prefabs/Tiles",
                "Assets/_Project/Scenes",
                "Assets/_Project/Scripts/Core",
                "Assets/_Project/Scripts/Audio",
                "Assets/_Project/Scripts/Input",
                "Assets/_Project/Scripts/UI",
                "Assets/_Project/Scripts/Editor",
                "Assets/_Project/Sprites/Common",
                "Assets/_Project/Sprites/Themes"
            };

            foreach (string folder in folders)
            {
                if (!AssetDatabase.IsValidFolder(folder))
                {
                    string parent = System.IO.Path.GetDirectoryName(folder).Replace('\\', '/');
                    string newFolderName = System.IO.Path.GetFileName(folder);
                    AssetDatabase.CreateFolder(parent, newFolderName);
                }
            }

            AssetDatabase.Refresh();
            Debug.Log("[GridShift] Estrutura de pastas verificada e atualizada com sucesso.");
        }

        [MenuItem("Tools/GridShift/2. Gerar Estrutura de UI Canvas (Fases 1, 2 e 3)", false, 2)]
        public static void SetupCanvasHierarchy()
        {
            // 1. Root Canvas
            GameObject canvasGo = GameObject.Find("Canvas");
            if (canvasGo == null)
            {
                canvasGo = new GameObject("Canvas");
                Undo.RegisterCreatedObjectUndo(canvasGo, "Create Canvas");
            }

            Canvas canvas = canvasGo.GetComponent<Canvas>();
            if (canvas == null) canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
            if (scaler == null) scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            scaler.referencePixelsPerUnit = 100;

            if (canvasGo.GetComponent<GraphicRaycaster>() == null)
            {
                canvasGo.AddComponent<GraphicRaycaster>();
            }

            // 2. EventSystem
            if (Object.FindAnyObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem");
                es.AddComponent<UnityEngine.EventSystems.EventSystem>();
                es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
                Undo.RegisterCreatedObjectUndo(es, "Create EventSystem");
            }

            // 3. SafeArea Container
            Transform safeAreaTr = canvasGo.transform.Find("SafeArea");
            GameObject safeAreaGo;
            if (safeAreaTr == null)
            {
                safeAreaGo = new GameObject("SafeArea", typeof(RectTransform));
                safeAreaGo.transform.SetParent(canvasGo.transform, false);
                Undo.RegisterCreatedObjectUndo(safeAreaGo, "Create SafeArea");
            }
            else
            {
                safeAreaGo = safeAreaTr.gameObject;
            }

            RectTransform safeAreaRect = safeAreaGo.GetComponent<RectTransform>();
            safeAreaRect.anchorMin = Vector2.zero;
            safeAreaRect.anchorMax = Vector2.one;
            safeAreaRect.offsetMin = Vector2.zero;
            safeAreaRect.offsetMax = Vector2.zero;

            if (safeAreaGo.GetComponent<SafeAreaFitter>() == null)
            {
                safeAreaGo.AddComponent<SafeAreaFitter>();
            }

            // 4. TopHUD (Painel superior com DifficultyBar e StatsRow)
            GameObject topHudGo = CreateUIElementIfNotExists(safeAreaGo.transform, "TopHUD", rect =>
            {
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.sizeDelta = new Vector2(0f, 260f);
                rect.anchoredPosition = Vector2.zero;
            });

            // 4A. DifficultyBar (Abas 3x3, 4x4, 5x5)
            GameObject diffBarGo = CreateUIElementIfNotExists(topHudGo.transform, "DifficultyBar", rect =>
            {
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.sizeDelta = new Vector2(0f, 90f);
                rect.anchoredPosition = new Vector2(0f, -10f);

                HorizontalLayoutGroup hlg = rect.GetComponent<HorizontalLayoutGroup>();
                if (hlg == null) hlg = rect.gameObject.AddComponent<HorizontalLayoutGroup>();
                hlg.childAlignment = TextAnchor.MiddleCenter;
                hlg.spacing = 24f;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = false;
            });

            Button btn3 = CreateTabButton(diffBarGo.transform, "Btn_3x3", "3x3");
            Button btn4 = CreateTabButton(diffBarGo.transform, "Btn_4x4", "4x4");
            Button btn5 = CreateTabButton(diffBarGo.transform, "Btn_5x5", "5x5");

            // 4B. StatsRow (Timer, StatusBadge, Moves, Restart)
            GameObject statsRowGo = CreateUIElementIfNotExists(topHudGo.transform, "StatsRow", rect =>
            {
                rect.anchorMin = new Vector2(0f, 0f);
                rect.anchorMax = new Vector2(1f, 0f);
                rect.pivot = new Vector2(0.5f, 0f);
                rect.sizeDelta = new Vector2(0f, 140f);
                rect.anchoredPosition = new Vector2(0f, 10f);

                HorizontalLayoutGroup hlg = rect.GetComponent<HorizontalLayoutGroup>();
                if (hlg == null) hlg = rect.gameObject.AddComponent<HorizontalLayoutGroup>();
                hlg.childAlignment = TextAnchor.MiddleCenter;
                hlg.spacing = 30f;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = false;
            });

            TextMeshProUGUI timerText = CreateStatBlock(statsRowGo.transform, "TimerBlock", "TEMPO", "00:00", 180f);
            TextMeshProUGUI statusText = CreateStatBadge(statsRowGo.transform, "StatusBadge", "5X5", 180f);
            TextMeshProUGUI movesText = CreateStatBlock(statsRowGo.transform, "MovesBlock", "MOVIMENTOS", "0", 180f);
            Button restartBtn = CreateIconButton(statsRowGo.transform, "RestartButton", "↺", 100f);

            // 5. Board Area (Area Central dinamica)
            GameObject boardAreaGo = CreateUIElementIfNotExists(safeAreaGo.transform, "BoardArea", rect =>
            {
                rect.anchorMin = new Vector2(0f, 0f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.offsetMin = new Vector2(0f, 100f);  // Espaco do rodape
                rect.offsetMax = new Vector2(0f, -280f); // Espaco do TopHUD
            });

            // 6. Board Container 1:1 com ResponsiveBoardContainer e GridController
            GridController gridController = null;
            CreateUIElementIfNotExists(boardAreaGo.transform, "BoardContainer", rect =>
            {
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(800f, 800f);
                rect.anchoredPosition = Vector2.zero;

                if (rect.GetComponent<ResponsiveBoardContainer>() == null)
                {
                    rect.gameObject.AddComponent<ResponsiveBoardContainer>();
                }

                gridController = rect.GetComponent<GridController>();
                if (gridController == null)
                {
                    gridController = rect.gameObject.AddComponent<GridController>();
                }

                TileView prefab = AssetDatabase.LoadAssetAtPath<TileView>(TilePrefabPath);
                if (prefab != null)
                {
                    gridController.SetTilePrefab(prefab);
                }
            });

            // 7. Footer Panel (Rodape)
            CreateUIElementIfNotExists(safeAreaGo.transform, "FooterPanel", rect =>
            {
                rect.anchorMin = new Vector2(0f, 0f);
                rect.anchorMax = new Vector2(1f, 0f);
                rect.pivot = new Vector2(0.5f, 0f);
                rect.sizeDelta = new Vector2(0f, 100f);
                rect.anchoredPosition = Vector2.zero;
            });

            // 8. UIManager GameObject
            GameObject uiManagerGo = GameObject.Find("UIManager");
            if (uiManagerGo == null)
            {
                uiManagerGo = new GameObject("UIManager");
                Undo.RegisterCreatedObjectUndo(uiManagerGo, "Create UIManager");
            }

            UIManager uiManager = uiManagerGo.GetComponent<UIManager>();
            if (uiManager == null) uiManager = uiManagerGo.AddComponent<UIManager>();
            uiManager.SetReferences(gridController, timerText, movesText, statusText, restartBtn, btn3, btn4, btn5);
            EditorUtility.SetDirty(uiManager);

            Selection.activeGameObject = uiManagerGo;
            Debug.Log("[GridShift] Hierarquia de Canvas, TopHUD, BoardContainer e UIManager configurada com sucesso!");
        }

        [MenuItem("Tools/GridShift/3. Gerar Prefab do Tile (Fase 2)", false, 3)]
        public static void CreateTilePrefab()
        {
            if (!AssetDatabase.IsValidFolder("Assets/_Project/Prefabs/Tiles"))
            {
                CreateFolderHierarchy();
            }

            // Cria GameObject raiz do Tile
            GameObject tileGo = new GameObject("Tile", typeof(RectTransform), typeof(CanvasRenderer), typeof(Image), typeof(Button), typeof(TileView));
            RectTransform tileRt = tileGo.GetComponent<RectTransform>();
            tileRt.sizeDelta = new Vector2(160f, 160f);

            // Configuracao visual do background
            Image bg = tileGo.GetComponent<Image>();
            bg.color = new Color(0.12f, 0.16f, 0.23f, 1.0f); // Slate escuro moderno

            Button btn = tileGo.GetComponent<Button>();
            ColorBlock colors = btn.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.9f, 0.95f, 1f, 1f);
            colors.pressedColor = new Color(0.7f, 0.8f, 0.95f, 1f);
            btn.colors = colors;

            // Cria filho NumberLabel com TextMeshProUGUI
            GameObject labelGo = new GameObject("NumberLabel", typeof(RectTransform), typeof(CanvasRenderer), typeof(TextMeshProUGUI));
            labelGo.transform.SetParent(tileGo.transform, false);

            RectTransform labelRt = labelGo.GetComponent<RectTransform>();
            labelRt.anchorMin = Vector2.zero;
            labelRt.anchorMax = Vector2.one;
            labelRt.offsetMin = Vector2.zero;
            labelRt.offsetMax = Vector2.zero;

            TextMeshProUGUI labelTmp = labelGo.GetComponent<TextMeshProUGUI>();
            labelTmp.text = "1";
            labelTmp.alignment = TextAlignmentOptions.Center;
            labelTmp.enableAutoSizing = true;
            labelTmp.fontSizeMin = 20;
            labelTmp.fontSizeMax = 72;
            labelTmp.fontStyle = FontStyles.Bold;
            labelTmp.color = new Color(0.96f, 0.98f, 1f, 1f);

            // Vincula no TileView
            TileView tileView = tileGo.GetComponent<TileView>();
            tileView.SetReferences(labelTmp, bg);

            // Salva como prefab
            PrefabUtility.SaveAsPrefabAsset(tileGo, TilePrefabPath);
            Object.DestroyImmediate(tileGo);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Atualiza GridController na cena se existir
            GridController controller = Object.FindAnyObjectByType<GridController>();
            if (controller != null)
            {
                TileView prefab = AssetDatabase.LoadAssetAtPath<TileView>(TilePrefabPath);
                if (prefab != null)
                {
                    controller.SetTilePrefab(prefab);
                    EditorUtility.SetDirty(controller);
                }
            }

            Debug.Log($"[GridShift] Prefab do Tile gerado com sucesso em: {TilePrefabPath}");
        }

        [MenuItem("Tools/GridShift/4. Executar Setup Completo (Fase 1, 2 e 3)", false, 4)]
        public static void RunFullSetup()
        {
            CreateFolderHierarchy();
            CreateTilePrefab();
            SetupCanvasHierarchy();
            Debug.Log("[GridShift] Setup completo (Fases 1, 2 e 3) concluido!");
        }

        private static Button CreateTabButton(Transform parent, string name, string label)
        {
            GameObject btnGo = CreateUIElementIfNotExists(parent, name, rect =>
            {
                rect.sizeDelta = new Vector2(160f, 64f);
            });

            Image img = btnGo.GetComponent<Image>();
            if (img == null) img = btnGo.AddComponent<Image>();
            img.color = new Color(0.22f, 0.25f, 0.30f, 1f);

            Button btn = btnGo.GetComponent<Button>();
            if (btn == null) btn = btnGo.AddComponent<Button>();

            Transform labelTr = btnGo.transform.Find("Label");
            TextMeshProUGUI tmp;
            if (labelTr == null)
            {
                GameObject labelGo = new GameObject("Label", typeof(RectTransform), typeof(CanvasRenderer), typeof(TextMeshProUGUI));
                labelGo.transform.SetParent(btnGo.transform, false);
                RectTransform rt = labelGo.GetComponent<RectTransform>();
                rt.anchorMin = Vector2.zero;
                rt.anchorMax = Vector2.one;
                rt.offsetMin = Vector2.zero;
                rt.offsetMax = Vector2.zero;
                tmp = labelGo.GetComponent<TextMeshProUGUI>();
            }
            else
            {
                tmp = labelTr.GetComponent<TextMeshProUGUI>();
            }

            tmp.text = label;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.fontSize = 28;
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = Color.white;

            return btn;
        }

        private static TextMeshProUGUI CreateStatBlock(Transform parent, string name, string title, string initialValue, float width)
        {
            GameObject blockGo = CreateUIElementIfNotExists(parent, name, rect =>
            {
                rect.sizeDelta = new Vector2(width, 100f);

                VerticalLayoutGroup vlg = rect.GetComponent<VerticalLayoutGroup>();
                if (vlg == null) vlg = rect.gameObject.AddComponent<VerticalLayoutGroup>();
                vlg.childAlignment = TextAnchor.MiddleCenter;
                vlg.spacing = 4f;
                vlg.childForceExpandWidth = false;
                vlg.childForceExpandHeight = false;
            });

            // Titulo
            CreateUIElementIfNotExists(blockGo.transform, "Title", rect =>
            {
                rect.sizeDelta = new Vector2(width, 24f);
                TextMeshProUGUI titleTmp = rect.GetComponent<TextMeshProUGUI>();
                if (titleTmp == null) titleTmp = rect.gameObject.AddComponent<TextMeshProUGUI>();
                titleTmp.text = title;
                titleTmp.fontSize = 18;
                titleTmp.alignment = TextAlignmentOptions.Center;
                titleTmp.color = new Color(0.65f, 0.70f, 0.78f, 1f);
            });

            // Valor
            TextMeshProUGUI valueTmp = null;
            CreateUIElementIfNotExists(blockGo.transform, "Value", rect =>
            {
                rect.sizeDelta = new Vector2(width, 48f);
                valueTmp = rect.GetComponent<TextMeshProUGUI>();
                if (valueTmp == null) valueTmp = rect.gameObject.AddComponent<TextMeshProUGUI>();
                valueTmp.text = initialValue;
                valueTmp.fontSize = 36;
                valueTmp.fontStyle = FontStyles.Bold;
                valueTmp.alignment = TextAlignmentOptions.Center;
                valueTmp.color = Color.white;
            });

            return valueTmp;
        }

        private static TextMeshProUGUI CreateStatBadge(Transform parent, string name, string initialValue, float width)
        {
            GameObject badgeGo = CreateUIElementIfNotExists(parent, name, rect =>
            {
                rect.sizeDelta = new Vector2(width, 80f);
            });

            Image img = badgeGo.GetComponent<Image>();
            if (img == null) img = badgeGo.AddComponent<Image>();
            img.color = new Color(0.18f, 0.22f, 0.28f, 1f);

            TextMeshProUGUI tmp = null;
            CreateUIElementIfNotExists(badgeGo.transform, "BadgeText", rect =>
            {
                rect.anchorMin = Vector2.zero;
                rect.anchorMax = Vector2.one;
                rect.offsetMin = Vector2.zero;
                rect.offsetMax = Vector2.zero;

                tmp = rect.GetComponent<TextMeshProUGUI>();
                if (tmp == null) tmp = rect.gameObject.AddComponent<TextMeshProUGUI>();
                tmp.text = initialValue;
                tmp.fontSize = 28;
                tmp.fontStyle = FontStyles.Bold;
                tmp.alignment = TextAlignmentOptions.Center;
                tmp.color = new Color(0.95f, 0.42f, 0.31f, 1f);
            });

            return tmp;
        }

        private static Button CreateIconButton(Transform parent, string name, string icon, float size)
        {
            GameObject btnGo = CreateUIElementIfNotExists(parent, name, rect =>
            {
                rect.sizeDelta = new Vector2(size, size);
            });

            Image img = btnGo.GetComponent<Image>();
            if (img == null) img = btnGo.AddComponent<Image>();
            img.color = new Color(0.24f, 0.28f, 0.36f, 1f);

            Button btn = btnGo.GetComponent<Button>();
            if (btn == null) btn = btnGo.AddComponent<Button>();

            Transform iconTr = btnGo.transform.Find("Icon");
            TextMeshProUGUI tmp;
            if (iconTr == null)
            {
                GameObject iconGo = new GameObject("Icon", typeof(RectTransform), typeof(CanvasRenderer), typeof(TextMeshProUGUI));
                iconGo.transform.SetParent(btnGo.transform, false);
                RectTransform rt = iconGo.GetComponent<RectTransform>();
                rt.anchorMin = Vector2.zero;
                rt.anchorMax = Vector2.one;
                rt.offsetMin = Vector2.zero;
                rt.offsetMax = Vector2.zero;
                tmp = iconGo.GetComponent<TextMeshProUGUI>();
            }
            else
            {
                tmp = iconTr.GetComponent<TextMeshProUGUI>();
            }

            tmp.text = icon;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.fontSize = 44;
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = Color.white;

            return btn;
        }

        private static GameObject CreateUIElementIfNotExists(Transform parent, string name, System.Action<RectTransform> setup)
        {
            Transform existing = parent.Find(name);
            GameObject go;
            if (existing == null)
            {
                go = new GameObject(name, typeof(RectTransform));
                go.transform.SetParent(parent, false);
                Undo.RegisterCreatedObjectUndo(go, $"Create {name}");
            }
            else
            {
                go = existing.gameObject;
            }

            RectTransform rt = go.GetComponent<RectTransform>();
            setup?.Invoke(rt);
            return go;
        }
    }
}
#endif
