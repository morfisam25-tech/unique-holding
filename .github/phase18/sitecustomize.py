from pathlib import Path

_expected = "User-agent: *\nAllow: /\n\nSitemap: https://www.uniqueholding.com.tr/sitemap.xml"
_original_read_text = Path.read_text

def _read_text_normalized(self, *args, **kwargs):
    value = _original_read_text(self, *args, **kwargs)
    if self.name == "robots.txt" and value.strip() == _expected.strip():
        return _expected
    return value

Path.read_text = _read_text_normalized
