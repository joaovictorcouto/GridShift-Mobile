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

        [MenuItem("Tools/GridShift/2. Gerar Estrutura de UI Canvas (Fase 1 e 2)", false, 2)]
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

            // 4. Header Panel (Topo)
            CreateUIElementIfNotExists(safeAreaGo.transform, "HeaderPanel", rect =>
            {
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.sizeDelta = new Vector2(0f, 220f);
                rect.anchoredPosition = Vector2.zero;
            });

            // 5. Difficulty Tabs Panel (Abaixo do Header)
            CreateUIElementIfNotExists(safeAreaGo.transform, "DifficultyPanel", rect =>
            {
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.sizeDelta = new Vector2(0f, 100f);
                rect.anchoredPosition = new Vector2(0f, -220f);
            });

            // 6. Board Area (Area Central dinamica)
            GameObject boardAreaGo = CreateUIElementIfNotExists(safeAreaGo.transform, "BoardArea", rect =>
            {
                rect.anchorMin = new Vector2(0f, 0f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.offsetMin = new Vector2(0f, 200f);
                rect.offsetMax = new Vector2(0f, -320f);
            });

            // 7. Board Container 1:1 com ResponsiveBoardContainer e GridController
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

                GridController controller = rect.GetComponent<GridController>();
                if (controller == null)
                {
                    controller = rect.gameObject.AddComponent<GridController>();
                }

                TileView prefab = AssetDatabase.LoadAssetAtPath<TileView>(TilePrefabPath);
                if (prefab != null)
                {
                    controller.SetTilePrefab(prefab);
                }
            });

            // 8. Footer Panel (Rodape)
            CreateUIElementIfNotExists(safeAreaGo.transform, "FooterPanel", rect =>
            {
                rect.anchorMin = new Vector2(0f, 0f);
                rect.anchorMax = new Vector2(1f, 0f);
                rect.pivot = new Vector2(0.5f, 0f);
                rect.sizeDelta = new Vector2(0f, 200f);
                rect.anchoredPosition = Vector2.zero;
            });

            Selection.activeGameObject = canvasGo;
            Debug.Log("[GridShift] Hierarquia de Canvas, SafeArea, BoardContainer e GridController configurada!");
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

        [MenuItem("Tools/GridShift/4. Executar Setup Completo (Fase 1 e 2)", false, 4)]
        public static void RunFullSetup()
        {
            CreateFolderHierarchy();
            CreateTilePrefab();
            SetupCanvasHierarchy();
            Debug.Log("[GridShift] Setup completo (Fases 1 e 2) concluido!");
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
