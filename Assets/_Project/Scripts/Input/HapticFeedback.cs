using UnityEngine;

public class HapticFeedback : MonoBehaviour
{
    [SerializeField] private bool hapticsEnabled = true;
    [SerializeField] [Range(0.02f, 0.25f)] private float minInterval = 0.05f;

    private float lastTriggerTime = -10f;

    public void SetEnabled(bool enabled)
    {
        hapticsEnabled = enabled;
    }

    public void TriggerLightTap()
    {
        if (!hapticsEnabled)
            return;

        if (Time.unscaledTime - lastTriggerTime < minInterval)
            return;

        lastTriggerTime = Time.unscaledTime;

#if UNITY_ANDROID || UNITY_IOS
        Handheld.Vibrate();
#endif
    }

    public void TriggerSuccess()
    {
        if (!hapticsEnabled)
            return;

#if UNITY_ANDROID || UNITY_IOS
        Handheld.Vibrate();
#endif
    }
}
