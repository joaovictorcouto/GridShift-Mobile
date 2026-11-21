using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildScript
{
    [MenuItem("Tools/GridShift/Build/Executar Build Atual", false, 50)]
    public static void PerformBuild()
    {
        string[] scenes = EditorBuildSettings.scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        if (scenes.Length == 0)
        {
            scenes = new[] { "Assets/_Project/Scenes/Game.unity" };
        }

        BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
        string outputPath = GetOutputPath(target);

        string directory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outputPath,
            target = target,
            options = BuildOptions.None
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new System.Exception($"Falha no build para {target}: {report.summary.result}");
        }

        Debug.Log($"Build concluido com sucesso em: {outputPath}");
    }

    private static string GetOutputPath(BuildTarget target)
    {
        switch (target)
        {
            case BuildTarget.Android:
                bool isAppBundle = EditorUserBuildSettings.buildAppBundle;
                return isAppBundle ? "build/Android/GridShift.aab" : "build/Android/GridShift.apk";
            case BuildTarget.iOS:
                return "build/iOS/XcodeProject";
            default:
                return "build/Standalone/GridShift";
        }
    }
}
