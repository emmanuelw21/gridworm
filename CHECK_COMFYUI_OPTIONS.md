# Check ComfyUI CORS Options

To see if your ComfyUI supports CORS flags, run:

```bash
python main.py --help
```

Or for the desktop app, look for these options:

## Common CORS-related flags in ComfyUI:
- `--enable-cors-header` - Enables CORS headers
- `--cors-allow-origin` - Sets allowed origins
- `--disable-header-check` - Disables origin checking
- `--listen` - Makes server accessible externally (may help with CORS)

## Quick Test Commands:

### Option 1: Enable CORS header
```bash
python main.py --enable-cors-header --port 8000
```

### Option 2: Disable header check (less secure)
```bash
python main.py --disable-header-check --port 8000
```

### Option 3: Listen on all interfaces
```bash
python main.py --listen 0.0.0.0 --port 8000
```

## If none of these work:

We have a few options:

1. **Use Gridworm's proxy mode**: Update Gridworm to connect to port 8189 instead, then run:
   ```bash
   python comfyui-starmie/starmie_proxy.py --comfyui-port 8000
   ```

2. **Modify ComfyUI directly**: We can provide instructions to patch ComfyUI's server.py

3. **Use a browser extension**: Temporarily disable CORS in your browser for testing

The CORS error is happening because ComfyUI is checking that the request origin (Gridworm on port 5174) matches the host (ComfyUI on port 8000). This is a security feature that we need to properly configure.