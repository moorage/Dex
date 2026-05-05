#!/bin/bash
# Test AI model connections
# Used by the $ai-setup and $ai-status skills

echo "=== Testing AI Connections ==="
echo ""

# Test OpenRouter
echo "☁️  OpenRouter (Budget Cloud):"
MODELS_JSON="$HOME/.pi/agent/models.json"

if [[ -f "$MODELS_JSON" ]] && grep -q "openrouter" "$MODELS_JSON"; then
    # Extract API key
    OPENROUTER_KEY=$(grep -A2 '"openrouter"' "$MODELS_JSON" | grep 'apiKey' | sed 's/.*"apiKey": "\([^"]*\)".*/\1/')
    
    if [[ -n "$OPENROUTER_KEY" && "$OPENROUTER_KEY" != "null" ]]; then
        # Test the connection
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $OPENROUTER_KEY" \
            "https://openrouter.ai/api/v1/auth/key" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        
        if [[ "$HTTP_CODE" == "200" ]]; then
            echo "   Status: ✅ Connected"
            
            # Try to get credit balance
            CREDITS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"\${d.get('data',{}).get('limit_remaining', 'unknown')}\")" 2>/dev/null || echo "unknown")
            echo "   Credits: $CREDITS"
        else
            echo "   Status: ❌ Connection failed (HTTP $HTTP_CODE)"
            echo "   Check your API key at openrouter.ai/keys"
        fi
    else
        echo "   Status: ⚠️ No API key configured"
    fi
else
    echo "   Status: Not configured"
    echo '   Set up with: $ai-setup'
fi

echo ""

# Test Ollama
echo "💻 Ollama (Offline):"

if command -v ollama &> /dev/null; then
    echo "   Installed: ✅ Yes"
    
    # Check if running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "   Running: ✅ Yes"
        
        # List models
        MODELS=$(ollama list 2>/dev/null | tail -n +2 | awk '{print "   - " $1}')
        if [[ -n "$MODELS" ]]; then
            echo "   Models:"
            echo "$MODELS"
        else
            echo "   Models: None installed"
            echo "   Install with: ollama pull qwen2.5:14b"
        fi
    else
        echo "   Running: ❌ No"
        echo "   Start with: ollama serve"
    fi
else
    echo "   Installed: ❌ No"
    echo "   Install from: https://ollama.ai/download"
fi

echo ""

# Test OpenAI / Codex premium
echo "🌟 GPT-5.5 (Premium):"

# Check Codex ChatGPT auth first
if command -v codex &> /dev/null; then
    CODEX_STATUS=$(codex login status 2>&1 || true)
    if [[ "$CODEX_STATUS" == *"Logged in using ChatGPT"* ]]; then
        echo "   Codex Auth: ✅ ChatGPT session active"
        if [[ -f "$HOME/.codex/auth.json" ]]; then
            echo "   Background Mode: ✅ File-backed auth.json present"
        else
            echo "   Background Mode: ⚠️ Logged in, but launchd support is best with ~/.codex/auth.json"
        fi
    elif [[ -n "$OPENAI_API_KEY" ]]; then
        echo "   API Key: ✅ Set (env var)"
        echo "   Codex Auth: ⚠️ ChatGPT session not active"
    elif [[ -n "$CODEX_STATUS" ]]; then
        echo "   Codex Auth: ⚠️ $CODEX_STATUS"
    else
        echo "   Codex Auth: ⚠️ Not logged in"
        echo "   Run: codex login"
    fi
elif [[ -n "$OPENAI_API_KEY" ]]; then
    echo "   API Key: ✅ Set (env var)"
else
    echo "   Codex Auth: ❌ codex CLI not installed"
    echo "   API Key: ⚠️ No OPENAI_API_KEY found"
fi

# Quick connectivity test
if curl -s --max-time 5 https://api.openai.com > /dev/null 2>&1; then
    echo "   Connection: ✅ Reachable"
else
    echo "   Connection: ⚠️ Cannot reach API (offline?)"
fi

echo ""
echo "=== Summary ==="

# Build summary
BUDGET_OK=false
OFFLINE_OK=false
PREMIUM_OK=false

if [[ -f "$MODELS_JSON" ]] && grep -q "openrouter" "$MODELS_JSON"; then
    BUDGET_OK=true
fi

if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    if ollama list 2>/dev/null | tail -n +2 | grep -q .; then
        OFFLINE_OK=true
    fi
fi

if command -v codex &> /dev/null && codex login status 2>&1 | grep -q "Logged in using ChatGPT"; then
    PREMIUM_OK=true
elif [[ -n "$OPENAI_API_KEY" ]]; then
    PREMIUM_OK=true
fi

if $PREMIUM_OK; then
    echo "Premium (GPT-5.5): ✅ Available"
else
    echo "Premium (GPT-5.5): ❌ Not configured"
fi
if $BUDGET_OK; then
    echo "Budget Cloud:      ✅ Configured"
else
    echo "Budget Cloud:      ❌ Not configured"
fi
if $OFFLINE_OK; then
    echo "Offline Mode:      ✅ Ready"
else
    echo "Offline Mode:      ❌ Not ready"
fi

echo ""
echo 'Configure with: $ai-setup'
