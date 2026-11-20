using UnityEngine;

[RequireComponent(typeof(AudioSource))]
public class AudioManager : MonoBehaviour
{
    [Header("Clipes de Audio")]
    [SerializeField] private AudioClip slideClip;
    [SerializeField] private AudioClip victoryClip;

    [Header("Variacao e Volume")]
    [SerializeField] [Range(0f, 1f)] private float masterVolume = 0.8f;
    [SerializeField] [Range(0.9f, 1.1f)] private float minSlidePitch = 0.97f;
    [SerializeField] [Range(1.0f, 1.1f)] private float maxSlidePitch = 1.03f;

    private AudioSource sfxSource;
    private bool isMuted;

    public bool IsMuted => isMuted;

    void Awake()
    {
        sfxSource = GetComponent<AudioSource>();
        if (sfxSource != null)
        {
            sfxSource.playOnAwake = false;
            sfxSource.loop = false;
        }
    }

    public void ToggleMute()
    {
        SetMuted(!isMuted);
    }

    public void SetMuted(bool muted)
    {
        isMuted = muted;
        if (sfxSource != null)
            sfxSource.mute = isMuted;
    }

    public void PlaySlideSound()
    {
        if (isMuted || slideClip == null || sfxSource == null)
            return;

        sfxSource.pitch = Random.Range(minSlidePitch, maxSlidePitch);
        sfxSource.PlayOneShot(slideClip, masterVolume);
    }

    public void PlayVictorySound()
    {
        if (isMuted || victoryClip == null || sfxSource == null)
            return;

        sfxSource.pitch = 1f;
        sfxSource.PlayOneShot(victoryClip, masterVolume);
    }

#if UNITY_EDITOR
    public void SetAudioClips(AudioClip slide, AudioClip victory)
    {
        slideClip = slide;
        victoryClip = victory;
    }
#endif
}
