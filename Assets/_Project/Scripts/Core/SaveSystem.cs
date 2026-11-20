using UnityEngine;

public static class SaveSystem
{
    private const string BestTimePrefix = "GridShift_BestTime_";
    private const string BestMovesPrefix = "GridShift_BestMoves_";

    public static void TrySaveRecord(int gridSize, float timeSeconds, int moves, out bool isNewBestTime, out bool isNewBestMoves)
    {
        isNewBestTime = false;
        isNewBestMoves = false;

        string timeKey = $"{BestTimePrefix}{gridSize}x{gridSize}";
        string movesKey = $"{BestMovesPrefix}{gridSize}x{gridSize}";

        if (timeSeconds > 0f)
        {
            float previousBestTime = PlayerPrefs.GetFloat(timeKey, -1f);
            if (previousBestTime < 0f || timeSeconds < previousBestTime)
            {
                PlayerPrefs.SetFloat(timeKey, timeSeconds);
                isNewBestTime = true;
            }
        }

        if (moves > 0)
        {
            int previousBestMoves = PlayerPrefs.GetInt(movesKey, -1);
            if (previousBestMoves < 0 || moves < previousBestMoves)
            {
                PlayerPrefs.SetInt(movesKey, moves);
                isNewBestMoves = true;
            }
        }

        PlayerPrefs.Save();
    }

    public static float GetBestTime(int gridSize)
    {
        return PlayerPrefs.GetFloat($"{BestTimePrefix}{gridSize}x{gridSize}", -1f);
    }

    public static int GetBestMoves(int gridSize)
    {
        return PlayerPrefs.GetInt($"{BestMovesPrefix}{gridSize}x{gridSize}", -1);
    }
}
