import sys
import time
import speech_recognition as sr

# رسالة تدل أن محرك الصوت اشتغل بنجاح وبعت إشارة للـ Node.js
print("[Python Audio Engine] Initialized and ready.", flush=True)

def listen_loop():
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()

    # ضبط الحساسية للضوضاء المحيطة
    with microphone as source:
        recognizer.adjust_for_ambient_noise(source, duration=1)

    print("[Python Audio Engine] Listening for commands...", flush=True)

    while True:
        try:
            with microphone as source:
                # الاستماع للصوت من المايكروفون
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            
            # تحويل الصوت لنص باستخدام محرك التعرف المحلي
            text = recognizer.recognize_google(audio).lower()
            print(f"[Transcript] {text}", flush=True)

            # إذا الكلمة فيها أوامر معينة، بنبعثها للـ Electron Main Process
            if "jarvis" in text or "جارفس" in text:
                print(f"[JARVIS_TRIGGERED] {text}", flush=True)

        except sr.WaitTimeoutError:
            # تجاهل انتهاء الوقت واستمر بالاستماع
            continue
        except sr.UnknownValueError:
            # لم يتم تمييز الكلام بوضوح
            continue
        except Exception as e:
            print(f"[Error] {e}", flush=True)
            time.sleep(1)

if __name__ == "__main__":
    try:
        listen_loop()
    except KeyboardInterrupt:
        sys.exit(0)