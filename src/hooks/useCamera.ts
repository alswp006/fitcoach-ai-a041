import { useState, useEffect } from "react";

export type CameraState = "idle" | "loading" | "ready" | "denied" | "unsupported";

export interface UseCameraReturn {
  state: CameraState;
  stream: MediaStream | null;
  error: Error | null;
}

export function useCamera(): UseCameraReturn {
  const [state, setState] = useState<CameraState>("loading");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices) {
      setState("unsupported");
      return;
    }

    let currentStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((mediaStream) => {
        currentStream = mediaStream;
        setStream(mediaStream);
        setState("ready");
      })
      .catch((err) => {
        if (err.name === "NotAllowedError") {
          setState("denied");
        } else {
          setState("denied");
          setError(err);
        }
      });

    return () => {
      currentStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { state, stream, error };
}
