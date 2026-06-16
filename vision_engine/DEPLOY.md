# Deploy do motor Python + ligar no app (passo a passo)

O motor roda como um **serviço HTTP separado** (não cabe na Vercel junto do
Next). O navegador NUNCA fala com ele: o app chama `/api/engine` (server-side)
que repassa — então o corp só enxerga o domínio do app.

## 1. Subir o motor (Railway — o mesmo que você usa no bia-bradesco)

1. railway.app → **New Project** → **Deploy from GitHub repo** → `ArturSouza293/projeto-vision`.
2. No serviço criado → **Settings** → **Root Directory** = `vision_engine`.
   (O Railway detecta Python pelo `requirements.txt` e roda o `Procfile`.)
3. **Variables** → adicione `ENGINE_API_KEY` = uma chave secreta sua (qualquer
   texto aleatório longo).
4. Deixe deployar. Copie a **URL pública** (ex.:
   `https://projeto-vision-production.up.railway.app`).
5. Teste: abra `<URL>/health` no navegador → deve mostrar `{"status":"ok","tools":5}`.

## 2. Ligar no app (Vercel)

1. Vercel → projeto **projeto-vision** → **Settings → Environment Variables**:
   - `ENGINE_API_URL` = a URL do Railway (sem `/` no fim).
   - `ENGINE_API_KEY` = a **mesma** chave do passo 1.3.
2. **Redeploy** (Deployments → ⋯ → Redeploy) para pegar as variáveis.

## 3. Conferir

- App → persona seed → aba **Cliente 360** → role até **"Motor de cálculo
  auditável"** → **Calcular no motor**.
- Deve aparecer o rendimento líquido + bruto/IOF/IR + a versão dos parâmetros.
- **Sem** as variáveis, o card mostra "motor não configurado" — não quebra nada.

## Notas

- Python 3.11+ (Railway usa 3.11/3.12 por padrão — ok).
- Trocar a senha do motor = mudar `ENGINE_API_KEY` nos dois lados.
- Rodar local p/ testar:
  `cd vision_engine && .venv/Scripts/python -m uvicorn api:app --port 8077`
  e `ENGINE_API_URL=http://127.0.0.1:8077 npx next start -p 3010`.
