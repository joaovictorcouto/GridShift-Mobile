# Script de inicializacao da arvore de diretorios do Unity para GridShift
$directories = @(
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
    "Assets/_Project/Sprites/Common",
    "Assets/_Project/Sprites/Themes"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        New-Item -ItemType File -Path (Join-Path $dir ".gitkeep") -Force | Out-Null
    }
}

Write-Output "Estrutura de pastas criada com sucesso."
