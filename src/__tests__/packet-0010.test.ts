import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCamera } from "@/hooks/useCamera";
import { speak } from "@/lib/speech";

describe("Packet 0010: 카메라 훅 + 음성 피드백 유틸", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useCamera hook", () => {
    it("AC-1: 권한 거부 시 상태가 'denied'가 되고 throw하지 않는다", async () => {
      const mockError = new DOMException(
        "Permission denied",
        "NotAllowedError"
      );
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: mockGetUserMedia,
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCamera());

      expect(result.current.state).toBe("loading");

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.state).toBe("denied");
      expect(result.current.stream).toBeNull();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: "user" },
      });
    });

    it("AC-2: navigator.mediaDevices 미존재 환경에서 상태가 'unsupported'가 된다", () => {
      const originalMediaDevices = global.navigator.mediaDevices;

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useCamera());

      expect(result.current.state).toBe("unsupported");
      expect(result.current.stream).toBeNull();

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: originalMediaDevices,
        configurable: true,
      });
    });

    it("AC-3: 훅 언마운트 시 stream의 모든 track.stop()이 호출된다", async () => {
      const mockTrack1 = { stop: vi.fn(), kind: "video" };
      const mockTrack2 = { stop: vi.fn(), kind: "audio" };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack1, mockTrack2]),
      };

      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: mockGetUserMedia,
        },
        writable: true,
        configurable: true,
      });

      const { unmount } = renderHook(() => useCamera());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      act(() => {
        unmount();
      });

      expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
      expect(mockStream.getTracks).toHaveBeenCalled();
    });

    it("성공 시 stream을 반환하고 상태가 'ready'가 된다", async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
      };

      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: mockGetUserMedia,
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCamera());

      expect(result.current.state).toBe("loading");

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.state).toBe("ready");
      expect(result.current.stream).toBe(mockStream);
    });
  });

  describe("speak utility", () => {
    it("AC-4: speechSynthesis 미지원 환경에서 speak()가 no-op으로 반환된다", () => {
      const originalSpeechSynthesis = global.speechSynthesis;

      Object.defineProperty(global, "speechSynthesis", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => {
        speak("테스트");
      }).not.toThrow();

      Object.defineProperty(global, "speechSynthesis", {
        value: originalSpeechSynthesis,
        writable: true,
        configurable: true,
      });
    });

    it("AC-5: 동일 문구를 1초 간격 2회 speak하면 실제 발화는 1회만 발생한다", () => {
      vi.useFakeTimers();

      const mockUtterance = { text: "", onend: null };
      const mockSpeak = vi.fn();

      Object.defineProperty(global, "speechSynthesis", {
        value: {
          speak: mockSpeak,
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          pending: false,
          paused: false,
          speaking: false,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global, "SpeechSynthesisUtterance", {
        value: vi.fn((text: string) => ({ text, onend: null })),
        writable: true,
        configurable: true,
      });

      speak("테스트");
      expect(mockSpeak).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      speak("테스트");

      expect(mockSpeak).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2100);

      speak("테스트");

      expect(mockSpeak).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("서로 다른 문구는 3초 내에도 발화된다", () => {
      vi.useFakeTimers();

      const mockUtterance = { text: "", onend: null };
      const mockSpeak = vi.fn();

      Object.defineProperty(global, "speechSynthesis", {
        value: {
          speak: mockSpeak,
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          pending: false,
          paused: false,
          speaking: false,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global, "SpeechSynthesisUtterance", {
        value: vi.fn((text: string) => ({ text, onend: null })),
        writable: true,
        configurable: true,
      });

      speak("첫 번째");
      expect(mockSpeak).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      speak("두 번째");
      expect(mockSpeak).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(1000);

      speak("세 번째");
      expect(mockSpeak).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it("speechSynthesis가 지원될 때 speak()가 정상 동작한다", () => {
      const mockUtterance = { text: "", onend: null };
      const mockSpeak = vi.fn();
      const MockUtterance = vi.fn((text: string) => ({ text, onend: null }));

      Object.defineProperty(global, "speechSynthesis", {
        value: {
          speak: mockSpeak,
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          pending: false,
          paused: false,
          speaking: false,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global, "SpeechSynthesisUtterance", {
        value: MockUtterance,
        writable: true,
        configurable: true,
      });

      speak("테스트 음성");

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      expect(MockUtterance).toHaveBeenCalledWith("테스트 음성");
    });
  });
});
