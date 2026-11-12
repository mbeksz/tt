// Yayın tipine göre doğru sahneyi yükler (maç ya da pavyon). Tip panelden değişince sayfa kendini yeniler.
const a = await fetch('/api/ayar', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
await import(a.mod === 'pavyon' ? './pavyonAna.js' : './ana.js');
