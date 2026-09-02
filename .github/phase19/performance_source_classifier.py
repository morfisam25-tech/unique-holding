from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
import re, subprocess

UNSPLASH_RE = re.compile(r'(photo-[0-9]+-[A-Za-z0-9]+)')
URL_RE = re.compile(r'https?://[^\s\'\"<>)]+' )


def logical_asset(url: str, resource_class: str = 'Image') -> str | None:
    try:
        p = urlparse(url)
    except Exception:
        return None
    if not p.scheme.startswith('http'):
        return None
    if resource_class == 'Image' and p.netloc == 'images.unsplash.com':
        m = UNSPLASH_RE.search(p.path)
        if m:
            return f'unsplash:{p.netloc}:{m.group(1)}'
    if resource_class == 'Image':
        return f'image:{p.netloc}:{p.path}'
    return f'{resource_class.lower()}:{p.netloc}:{p.path}'


def infer_source_class(url: str, declaration_type: str) -> str:
    path = urlparse(url).path.lower()
    if declaration_type in {'src', 'srcset', 'poster', 'preload-image', 'imagesrcset', 'css-url', 'css-image-set'}:
        return 'Image'
    if re.search(r'\.(png|jpe?g|webp|avif|gif|svg)$', path): return 'Image'
    if re.search(r'\.(mp4|webm)$', path): return 'Video'
    if re.search(r'\.(woff2?|ttf|otf)$', path): return 'Font'
    if re.search(r'\.m?js$', path): return 'Script'
    if path.endswith('.css'): return 'Stylesheet'
    return 'Other'


def declaration_type(line: str, suffix: str) -> str:
    l = line.lower()
    if suffix == '.css':
        if 'image-set(' in l: return 'css-image-set'
        if 'url(' in l: return 'css-url'
        if '@import' in l: return 'css-import'
        return 'css-url-literal'
    if suffix in {'.js', '.mjs'}: return 'js-url-literal'
    if 'imagesrcset' in l: return 'imagesrcset'
    if 'srcset' in l: return 'srcset'
    if 'poster=' in l: return 'poster'
    if '<link' in l and 'rel=' in l and 'preload' in l and 'as=' in l and 'image' in l: return 'preload-image'
    if 'src=' in l: return 'src'
    if '<link' in l and 'href=' in l: return 'link-href'
    return 'html-url-literal'


def _candidate_text(path: str) -> str | None:
    p = Path(path)
    if not p.exists() or not p.is_file(): return None
    try: return p.read_text(encoding='utf-8')
    except UnicodeDecodeError: return None


def _baseline_text(base: str, path: str) -> str | None:
    cp = subprocess.run(['git','show',f'{base}:{path}'], text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    return cp.stdout if cp.returncode == 0 else None


def read_text(side: str, base: str, path: str) -> str | None:
    return _baseline_text(base, path) if side == 'baseline' else _candidate_text(path)


def _local_html_dependencies(text: str) -> list[str]:
    deps=[]
    for m in re.finditer(r'<link\b[^>]*\brel=[\"\'][^\"\']*stylesheet[^\"\']*[\"\'][^>]*\bhref=[\"\']([^\"\']+)[\"\']', text, re.I):
        u=m.group(1).split('?',1)[0].split('#',1)[0]
        if u and not u.startswith(('http://','https://','//','data:')): deps.append(u)
    for m in re.finditer(r'<script\b[^>]*\bsrc=[\"\']([^\"\']+)[\"\']', text, re.I):
        u=m.group(1).split('?',1)[0].split('#',1)[0]
        if u and not u.startswith(('http://','https://','//','data:')): deps.append(u)
    return deps


def _local_css_imports(text: str, source_path: str) -> list[str]:
    deps=[]; root=Path(source_path).parent
    for m in re.finditer(r'@import\s+(?:url\()?[\"\']?([^\"\')\s;]+)', text, re.I):
        u=m.group(1).split('?',1)[0].split('#',1)[0]
        if u and not u.startswith(('http://','https://','//','data:')): deps.append(str((root/u).as_posix()))
    return deps


def route_dependency_closure(side: str, base: str, route: str) -> list[str]:
    seen=set(); queue=[route]
    while queue:
        path=queue.pop(0)
        if path in seen: continue
        seen.add(path)
        text=read_text(side,base,path)
        if text is None: continue
        suffix=Path(path).suffix.lower(); deps=[]
        if suffix=='.html': deps.extend(_local_html_dependencies(text))
        elif suffix=='.css': deps.extend(_local_css_imports(text,path))
        for dep in deps:
            dep=str(Path(dep).as_posix())
            if dep not in seen: queue.append(dep)
    return sorted(seen)


def extract_source_graph(side: str, base: str, route: str) -> dict:
    files=route_dependency_closure(side,base,route); refs=[]
    for path in files:
        text=read_text(side,base,path)
        if text is None: continue
        suffix=Path(path).suffix.lower()
        for lineno,line in enumerate(text.splitlines(),1):
            d=declaration_type(line,suffix)
            for m in URL_RE.finditer(line):
                url=m.group(0).rstrip(';,')
                cls=infer_source_class(url,d)
                refs.append({'exactUrl':url,'logicalAsset':logical_asset(url,cls),'resourceClass':cls,'host':urlparse(url).netloc,'sourceFile':path,'line':lineno,'declarationType':d})
    return {
        'side':side,'route':route,'files':files,'references':refs,
        'exactUrls':sorted(set(r['exactUrl'] for r in refs)),
        'logicalAssets':sorted(set(r['logicalAsset'] for r in refs if r['logicalAsset'])),
        'hosts':sorted(set(r['host'] for r in refs if r['host'])),
        'resourceClasses':sorted(set(r['resourceClass'] for r in refs)),
    }


def responsible_source_files(graph: dict, asset_id: str) -> list[str]:
    return sorted(set(r['sourceFile'] for r in graph.get('references',[]) if r.get('logicalAsset')==asset_id))


def changed_responsible_files(base: str, baseline_graph: dict, candidate_graph: dict, asset_id: str) -> list[str]:
    files=sorted(set(responsible_source_files(baseline_graph,asset_id)+responsible_source_files(candidate_graph,asset_id))); changed=[]
    for f in files:
        if _baseline_text(base,f)!=_candidate_text(f): changed.append(f)
    return changed


def classify_variant(*, url: str, resource_class: str, baseline_occurrences: int, candidate_occurrences: int,
                     baseline_source_exact: bool, candidate_source_exact: bool,
                     baseline_logical_source: bool, candidate_logical_source: bool,
                     responsible_source_changed: bool, candidate_only_host: bool=False,
                     candidate_only_class: bool=False, repeatable_candidate_increase: bool=False) -> dict:
    asset_id=logical_asset(url,resource_class)
    if candidate_only_host or candidate_only_class:
        return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'candidate-only host/resource class'}
    if candidate_source_exact and not baseline_source_exact:
        return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'SOURCE-ADDED RESOURCE'}
    if baseline_source_exact and not candidate_source_exact:
        if candidate_occurrences<=baseline_occurrences:
            return {'status':'PASS','classification':'SOURCE-REMOVED OPTIMIZATION','reason':'baseline exact source removed by candidate'}
        return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'removed source still increased at runtime'}
    if not baseline_logical_source and candidate_logical_source:
        return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'SOURCE-ADDED LOGICAL ASSET'}
    if baseline_logical_source and candidate_logical_source and not responsible_source_changed:
        if repeatable_candidate_increase:
            return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'repeatable candidate runtime increase'}
        if baseline_occurrences!=candidate_occurrences:
            return {'status':'PASS','classification':'MEASUREMENT VARIANCE — RUNTIME-ONLY STOCHASTIC VARIANT / NO CANDIDATE-INTRODUCED REGRESSION','reason':'unchanged pre-existing logical asset; runtime occurrence variance only','logicalAsset':asset_id}
        return {'status':'PASS','classification':'PRE-EXISTING SOURCE / RUNTIME EQUIVALENT','reason':'source and observed behavior equivalent'}
    if candidate_occurrences>baseline_occurrences:
        return {'status':'FAIL','classification':'REAL PERFORMANCE REGRESSION','reason':'runtime increase with changed/unknown responsible source'}
    return {'status':'PASS','classification':'NO CANDIDATE REGRESSION ESTABLISHED','reason':'no one-sided candidate increase'}
