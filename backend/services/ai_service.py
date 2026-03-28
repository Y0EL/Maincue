import httpx
import os
import json
import base64
import re
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

class AIService:
    def __init__(self):
        self.mode = os.getenv("AI_MODE", "openai") # default to openai
        self.local_url = os.getenv("OLLAMA_LOCAL_URL", "http://localhost:11434")
        self.cloud_url = os.getenv("OLLAMA_CLOUD_URL", "https://ollama.com")
        self.api_key = os.getenv("OLLAMA_API_KEY")
        self.ollama_model = os.getenv("DEFAULT_MODEL", "qwen3.5")
        
        # OpenAI Config
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
        self.client = AsyncOpenAI(api_key=self.openai_api_key)

    async def analyze_image(self, image_bytes: bytes):
        if self.mode == "openai":
            return await self._analyze_image_openai(image_bytes)
        return await self._analyze_image_ollama(image_bytes)

    async def _analyze_image_openai(self, image_bytes: bytes):
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = """
        Bertindaklah sebagai ahli gizi profesional. Analisis gambar makanan ini dan kembalikan hanya objek JSON murni tanpa markdown dengan format berikut:
        {
          "food_name": "string (Gunakan Bahasa Indonesia yang sederhana, contoh: 'Nasi Goreng Telur', bukan 'Fried Rice with sunny side up')",
          "estimated_weight_g": integer (estimasi berat dalam gram),
          "calories": integer (estimasi kalori yang masuk akal),
          "macronutrients": {
            "protein_g": integer (angka bulat atau natural),
            "fat_g": integer (angka bulat atau natural),
            "carbs_g": integer (angka bulat atau natural)
          },
          "health_score": integer (1-100),
          "confidence_score": float (0.0 - 1.0)
        }
        PENTING:
        1. Nama makanan harus Bahasa Indonesia dan singkat.
        2. Jangan memberikan teks penjelasan, pembukaan, atau penutup. 
        3. Kembalikan HANYA JSON murni.
        """

        try:
            print(f"[AI] Calling OpenAI ({self.openai_model})...")
            response = await self.client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                            },
                        ],
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            
            raw_res = response.choices[0].message.content
            return json.loads(raw_res)
        except Exception as e:
            print(f"[AI OpenAI] Error: {e}")
            raise e

    async def _analyze_image_ollama(self, image_bytes: bytes):
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = """
        Bertindaklah sebagai ahli gizi profesional. Analisis gambar makanan ini dan kembalikan hanya objek JSON murni tanpa markdown dengan format berikut:
        {
          "food_name": "string (Gunakan Bahasa Indonesia yang sederhana, contoh: 'Nasi Goreng Telur', bukan 'Fried Rice with sunny side up')",
          "estimated_weight_g": integer (estimasi berat dalam gram),
          "calories": integer (estimasi kalori yang masuk akal),
          "macronutrients": {
            "protein_g": integer (angka bulat atau natural),
            "fat_g": integer (angka bulat atau natural),
            "carbs_g": integer (angka bulat atau natural)
          },
          "health_score": integer (1-100),
          "confidence_score": float (0.0 - 1.0)
        }
        """

        url = self.cloud_url if self.mode == "cloud" else self.local_url
        endpoint = f"{url}/api/generate"
        headers = {}
        if self.mode == "cloud":
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "images": [base64_image],
            "stream": False,
            "format": "json"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                print(f"[AI] Calling Ollama {self.mode.upper()} ({self.ollama_model})...")
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()
                raw_response = result.get("response", "").strip()
                clean_json = re.sub(r'^```json\s*|```\s*$', '', raw_response, flags=re.MULTILINE).strip()
                return json.loads(clean_json)
            except Exception as e:
                print(f"[AI Ollama] Error: {e}")
                raise e

    async def get_recommendation(self, history_today: list, history_past: list, settings: dict, nearby_places: list = []):
        # Fallback for non-streaming
        res = ""
        async for chunk in self.stream_recommendation(history_today, history_past, settings, nearby_places):
            res += chunk
        return {"recommendation": res}

    async def stream_recommendation(self, history_today: list, history_past: list, settings: dict, nearby_places: list = []):
        total_today = sum([h.get('calories', 0) for h in history_today])
        goal = settings.get('calorieGoal', 2000)
        is_offside = total_today > goal
        gap = total_today - goal
        today_summary = "\\n".join([f"- {h.get('name', 'Unknown')} ({h.get('calories', 0)} kcal, P:{h.get('protein', 0)}g, K:{h.get('carbs', 0)}g, L:{h.get('fat', 0)}g)" for h in history_today])
        past_summary = ""
        if history_past:
            valid_scores = [h.get('score', 0) for h in history_past if isinstance(h.get('score'), (int, float))]
            avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0
            categories = [h.get('category', 'Lainnya') for h in history_past]
            most_common_cat = max(set(categories), key=categories.count) if categories else "Campur"
            past_summary = f"DATA HABIT: Rata-rata Health Score: {round(avg_score, 1)}/100. Paling sering: {most_common_cat}."
        else:
            past_summary = "DATA HABIT: Belum ada data historis."

        offside_instruction = f"SITUASI KRITIS: User sudah makan {total_today} kcal (kelebihan {gap} kcal). SARAN: BERHENTI MAKAN, sarankan minum air putih & olahraga ringan. Tegur dengan asik tapi tegas." if is_offside else f"SITUASI: User baru makan {total_today} dari target {goal} kcal. REKOMENDASI: 1-2 menu lokal Indonesia yang murah & sehat."

        nearby_info = ""
        if nearby_places:
            places_str = ", ".join([f"{p['name']} ({p['price_level']})" for p in nearby_places])
            nearby_info = f"TEMPAT MAKAN DEKAT USER: {places_str}. Sarankan satu porsi yang paling cocok di salah satu tempat ini."
        else:
            nearby_info = "LOKASI MATI/TIDAK ADA: Sarankan jenis makanan umum yang murah/sehat sesuai preferensi."

        prompt = f"""
        Bertindaklah sebagai asisten gizi pribadi yang sangat ramah dan asik (bestie). Jawab dalam Bahasa Indonesia santai (lo, gue, bro, bestie).
        PROGRAM USER: {settings.get('goal', 'Menjaga Berat Badan')}
        TARGET: {goal} kcal
        {past_summary}
        MAKANAN HARI INI: {today_summary if history_today else "Belum ada."}
        {offside_instruction}
        {nearby_info}
        ATURAN: Berikan 2-4 kalimat saran singkat. Gunakan **bold** untuk kata kunci. JANGAN pakai dash (-).
        """

        try:
            if self.mode == "openai":
                print(f"[AI] Calling OpenAI ({self.openai_model})...")
                response = await self.client.chat.completions.create(
                    model=self.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    stream=True,
                    max_tokens=400
                )
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content.replace("—", " ").replace("-", " ")
            else:
                yield "Ollama streaming not implemented yet."
        except Exception as e:
            print(f"[AI Recommendation] Connection Error: {type(e).__name__}: {str(e)}")
            yield f"⚠️ Cimeat AI sedang gangguan koneksi ({type(e).__name__}). Coba beberapa saat lagi ya bro! 💪"

    async def generate_recipe(self, images_bytes: list, settings: dict, additional_prompt: str = ""):
        res = ""
        async for chunk in self.stream_recipe(images_bytes, settings, additional_prompt):
            res += chunk
        return {"recipe": res}

    async def stream_recipe(self, images_bytes: list, settings: dict, additional_prompt: str = ""):
        user_request_text = f"\nREQUEST TAMBAHAN USER: {additional_prompt}" if additional_prompt.strip() else ""
        prompt = f"""
        Tugas: Jadi Chef AI & Ahli Gizi Cimeat. Jawab dalam Bahasa Indonesia gaul (lo, gue, bro, bestie).
        Buat 1 resep lokal Indonesia yang simpel & enak (sesuaikan foto/target).
        SISA TARGET: Cal {settings.get('calorieGoal')} kcal, P {settings.get('proteinGoal')}g, K {settings.get('carbsGoal')}g, L {settings.get('fatGoal')}g.{user_request_text}
        FORMAT: Markdown (# Nama, Deskripsi asik, ## Bahan, ## Cara Masak, ## Nutrisi)
        JANGAN tulis kata 'Intro' sebagai judul. Langsung tulis deskripsi resepnya aja secara natural.
        """
        
        try:
            if self.mode == "openai":
                content = [{"type": "text", "text": prompt}]
                if images_bytes:
                    for img in images_bytes:
                        b64 = base64.b64encode(img).decode('utf-8')
                        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
                
                print(f"[AI Recipe] Calling OpenAI ({self.openai_model})...")
                response = await self.client.chat.completions.create(
                    model=self.openai_model,
                    messages=[{"role": "user", "content": content}],
                    stream=True,
                    max_tokens=1000
                )
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield "Ollama recipe streaming not implemented."
        except Exception as e:
            print(f"[AI Recipe] Connection Error: {e}")
            yield f"⚠️ Waduh, Chef AI lagi gak dapet koneksi nih: {e}"

    async def chat_recipe(self, recipe_text: str, chat_history: list, new_message: str):
        res = ""
        async for chunk in self.stream_chat_recipe(recipe_text, chat_history, new_message):
            res += chunk
        return {"reply": res}

    async def stream_chat_recipe(self, recipe_text: str, chat_history: list, new_message: str):
        history_msgs = [{"role": msg.get('role', 'user'), "content": msg.get('content')} for msg in chat_history]
        system_prompt = f"""
        Bertindaklah sebagai Chef AI Pribadi dan Ahli Gizi Cimeat yang gaul. 
        Konteks resep: {recipe_text}
        Balas dalam Bahasa Indonesia santai (lo, gue, bro, bestie).
        """
        
        if self.mode == "openai":
            try:
                msgs = [{"role": "system", "content": system_prompt}] + history_msgs + [{"role": "user", "content": new_message}]
                response = await self.client.chat.completions.create(
                    model=self.openai_model,
                    messages=msgs,
                    stream=True,
                    max_tokens=600
                )
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                yield f"Error: {e}"
        else:
            yield "Ollama chat streaming not implemented."

    async def transcribe_audio(self, audio_bytes: bytes):
        if self.mode != "openai":
            return "Whisper only works on OpenAI mode."
        
        # Save temp file
        import tempfile
        from pathlib import Path
        
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)
        
        try:
            with open(tmp_path, "rb") as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="id"
                )
                return transcript.text
        except Exception as e:
            print(f"[AI Whisper] Error: {e}")
            return f"Error: {e}"
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    async def analyze_text_log(self, text: str):
        prompt = f"""
        Ahli gizi profesional. Ekstrak makanan dari teks: "{text}"
        JSON format:
        {{
          "food_name": "string",
          "estimated_weight_g": int,
          "calories": int,
          "macronutrients": {{ "protein_g": int, "fat_g": int, "carbs_g": int }},
          "health_score": 1-100
        }}
        """
        if self.mode == "openai":
            try:
                response = await self.client.chat.completions.create(
                    model=self.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                )
                data = json.loads(response.choices[0].message.content)
                if "confidence_score" not in data: data["confidence_score"] = 0.95
                return data
            except Exception as e:
                print(f"[AI Text OpenAI] Error: {e}")
                raise e
        return {"error": "Ollama text analysis not ported."}

    async def get_share_quote(self, daily_stats: dict, streak: int, settings: dict):
        total_cal = daily_stats.get('calories', 0)
        goal = settings.get('calorieGoal', 2000)
        protein = daily_stats.get('protein', 0)
        carbs = daily_stats.get('carbs', 0)
        fat = daily_stats.get('fat', 0)
        
        status = "GOAL REACHED" if total_cal <= goal else "OFFSIDE"
        gap = abs(total_cal - goal)
        
        prompt = f"""
        Bertindaklah sebagai 'Cimit', asisten gizi paling gaul (bestie). 
        Tugas: Buat 1 kalimat (MAKSIMAL 12 KATA) penyemangat super nendang untuk user pamer (flexing).
        DATA: {total_cal}/{goal} kcal. P: {protein}g.
        STREAK: {streak} hari.
        STATUS: {status}.
        ATURAN:
        1. Bahasa Indonesia GAUL (lo, gue, bestie, parah, gokil, bejir).
        2. Harus SATU KALIMAT PENDEK (ONE-LINER).
        3. JANGAN pakai markdown atau tanda kutip.
        4. Langsung to-the-point dan asik banget!
        """
        
        try:
            if self.mode == "openai":
                response = await self.client.chat.completions.create(
                    model=self.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=100
                )
                return response.choices[0].message.content.strip().replace('"', '')
            return "Gokil banget progres lo hari ini, bestie! Terusin streak-nya biar makin mantap! 🔥"
        except Exception as e:
            print(f"[AI Quote] Error: {e}")
            return "Streak lo makin ngeri, bestie! Jangan kasih kendor, gaskeun terus pola hidup sehatnya! 💪🔥"

ai_service = AIService()
