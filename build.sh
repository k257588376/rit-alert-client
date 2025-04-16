deno compile \
  --include src/default-config.jsonc \
  --include src/default-test-event.jsonc \
  --include src/hooks/useWindowsToasts/toast.ps1 \
  --include src/html --check -R -W -E -N \
  -S="homedir,uid,gid,userInfo" --allow-run \
  -o ./dist/rit-alert --target x86_64-unknown-linux-gnu ./src/index.ts

deno compile \
  --include src/default-config.jsonc \
  --include src/default-test-event.jsonc \
  --include src/hooks/useWindowsToasts/toast.ps1 \
  --include src/html --no-check -R -W -E -N \
  -S="homedir,uid,gid,userInfo" --allow-run \
  -o ./dist/rit-alert-macOS-arm64 --target aarch64-apple-darwin ./src/index.ts

deno compile \
  --include src/default-config.jsonc \
  --include src/default-test-event.jsonc \
  --include src/hooks/useWindowsToasts/toast.ps1 \
  --include src/html --no-check -R -W -E -N \
  -S="homedir,uid,gid,userInfo" --allow-run \
  -o ./dist/rit-alert --target x86_64-pc-windows-msvc ./src/index.ts
