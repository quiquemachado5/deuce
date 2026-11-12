import json,gzip,pathlib,collections,csv,datetime
root=pathlib.Path.cwd();out=root/'docs/audits/2026-11-12/avance-v31';out.mkdir(exist_ok=True)
base=json.load(open('docs/audits/2026-11-12/avance-v30/estado.json'))
manifest=json.load(gzip.open('data/reading/manifest.json.gz')); version=manifest['version']
pointer=json.load(open(root/'.deuce-cache/research'/version/'latest.json'))
report=json.load(open(root/'.deuce-cache/research'/version/pointer['definitionVersion']/'report.json'))
products=json.load(gzip.open(root/'.deuce-cache/research'/version/pointer['definitionVersion']/'products.json.gz'))['products']
media=json.load(open('data/media/edition-photo-coverage-v31.json'))
backend=json.load(open(out/'backend-y-formatos.json'))
changes={c['id']:(c['status'],c['implementation']) for c in backend['criticisms']}
changes.update({
  3:('Parcial','Auditoría recalculada: de16ediciones clasificadas como incompletas a1. Se corrigieron formatos, ocurrencias de calendario y resultados con evidencia. Las3.143ediciones sin certificación siguen sin darse por completas.'),
  6:('Resuelto en local para el caso Federer–Nadal','Restaurada la edición completa de Dubái2006:31fixturesconfuenteATPoriginal y contraste. Federer–Nadal40encuentros,Nadal24–16. No certifica automáticamente las demás carreras.'),
  20:('Parcial','El índice rechaza identidades duplicadas; una corrección de año invalida tanto la temporada antigua como la nueva. Falta ensayo integral de todas las dependencias publicadas.'),
  31:('Parcial','Cada intento HTTP real, incluidos reintentos, consume presupuesto persistido antes de enviarse. Sin devolución automática por fallo. Falta certificar renovación y fencing del lease entre hosts.'),
  32:('Parcial','El presupuesto persistido se consulta dentro del lease existente y falla cerrado si la cuota es ilegible o desconocida. Falta demostrar exclusión transaccional multihost ante caída del proceso.'),
  33:('Resuelto en local','Limitador SQLite compartido entre procesos con incremento atómico; probado en4procesos concurrentes. Fallos de almacén rechazan peticiones; no se vuelve al contador por proceso. Configuración Netcup preparada, sin desplegar.'),
  36:('Parcial','Once importadores usan HTTPS con hosts exactos aprobados, sin redirecciones,20MBmáximo y timeout de cuerpo completo. No se declara migrada toda ruta administrativa heredada.'),
  57:('Parcial','Índice y delta de publicación validados; las correcciones de temporada afectan ambos lados. Falta un changelog semántico archivado de todos los productos derivados.'),
  67:('Resuelto en local','JSON mutable con máximo300segundos fresco+300stale; Next limita caducidad HTML/RSC a600segundos. Imágenes/vídeo mutables1día con revalidación. Pruebas con el generador real de cabeceras deNext.'),
  68:('Parcial','Corregidas decisiones de fuente inconsistentes en un renderRSC y caché global sin clave de versión. Ensayo Flight real con cambioA→B durante suspensión. Falta protocolo cliente que fije versión entre peticiones independientes.'),
  69:('Parcial','Ensayo del lector streaming con1.483.020filas,1.185MBJSON y heap256MiB: picoRSS168,8MiB. No es todavía un ensayo integral de publicación y estadísticas a escala×10.'),
  30:('Parcial','Ensayo HTTP en modo producción local:24peticiones a4rutas,concurrencia4,p95caliente515ms; sin errores. Match frío937ms. No representa latencia de producción ni Core Web Vitals reales.'),
  9:('Parcial','Corregida temporada AO1973; dos celebraciones AO1977 y dos Adelaide2023 se distinguen en auditoría de edición, sin confundir fecha civil con temporada.'),
  19:('Parcial','US1969 conserva el conflicto: varias páginas reproducen7–3, incluso la fuente oficial. Coincidencia no se confunde con validación de un resultado imposible.'),
  41:('Parcial','Límite compartido SQLite+Caddy para APIv1, sin cobrar servicios externos. No se promete impedir la copia de información pública o bots con IPs rotatorias.'),
  45:('Parcial','Cada lote nuevo se inspecciona visualmente. Se rechazaron falsas asociaciones de año, torneo y disciplina incluso en CMS oficiales. Esto no certifica todavía todo el catálogo antiguo de tenistas.'),
  54:('Parcial','Auditoría separa January/December de Australia1977 con evidencia. Las rutas de ficha por torneo+año aún no representan todas las ocurrencias como entidades independientes.'),
  59:('Parcial','Contratos de edición completa no descartan silenciosamente partidos sin estadísticas; corregidos minutos prefinal, breaks y semifinal–final sin fecha. Los100 productos conservan muestra y exclusiones por circuito.'),
  60:('Parcial','Auditoría de disponibilidad con denominador completo en5.645cohortes de circuito, año, categoría, ronda y jugador. Diferencia ausencia de enriquecimiento de ausencia de partidos. No estima causalidad ni censo mundial.'),
  61:('Parcial','Modelo de investigación Elo versionado: solo fechas exactas, ratings previos al día, ATP/WTA separados, Brier/log-loss tras10 observaciones. No sustituye automáticamente todos los productos públicos históricos.'),
  98:('Resuelto en local','200 CSV versionados, manifiesto SHA256, diccionario, ámbito, evidencia exigida y ejemplos. Celdas de texto neutralizan fórmulas. No se conceden derechos ajenos ni se publica una nueva API.'),
})
criticisms=[]
for row in base['criticisms']:
 row=dict(row)
 if row['id'] in changes:row['status'],row['progress']=changes[row['id']]
 criticisms.append(row)
ideas=[]
for old in base['ideas']:
 pairs=[p for p in products if p['id']==old['id']];ok=[p for p in pairs if p['status']=='calculated-in-sample'];req=sorted(set(c for p in pairs for c in p['required']))
 missing=[c for c in req if c in ['observed-points','dated-country','regulation-registry','event-registry','edition-census']]
 status='Calculada en muestra' if len(ok)==2 else 'Parcial por circuito' if ok else 'Bloqueada por evidencia'
 reason=('Cálculo reproducible en '+', '.join(p['tour'].upper() for p in ok)+'. No acredita récord absoluto.' if ok else 'No genera una cifra sin evidencia suficiente: '+', '.join(missing or req)+'.')
 ideas.append({'id':old['id'],'title':next(x['title'] for x in report['products'] if x['id']==old['id']),'status':status,'reason':reason,'required':req,'circuits':[{k:p[k] for k in ['tour','status','eligible','excluded']}|{'rows':len(p['rows'])} for p in pairs]})
audit=json.load(gzip.open('data/reading/audit.json.gz'))
summary={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'datasetVersion':version,'definitionVersion':pointer['definitionVersion'],'published':manifest['matchCount'],'byTour':manifest['summary']['tours'],'criticisms':dict(collections.Counter(c['status'] for c in criticisms)),'ideas':dict(collections.Counter(i['status'] for i in ideas)),'calculatedSelections':report['computedSelections'],'blockedSelections':report['blockedSelections'],'qualityControls':report['qualityControls'],'qualityErrors':report['quality']['errorCount'],'editionAudit':dict(collections.Counter('certified' if a.get('completeDraw') is True else 'incomplete' if a.get('completeDraw') is False else 'uncertified' for a in audit)),'photos':{k:media[k] for k in ['counts','editionCircuitKeys','uniqueHeroAssets','libraryPhotos','heroBytes']},'productionChanged':False,'newLiveTennisCalls':0}
json.dump({'summary':summary,'criticisms':criticisms,'ideas':ideas},open(out/'estado.json','w'),ensure_ascii=False,indent=2)
with open(out/'medidas-200.csv','w') as f:
 w=csv.writer(f);w.writerow(['ID','Bloque','Medida','Estado real','Ejecución o límite verificable'])
 for r in criticisms:w.writerow([f'C{r["id"]:03}','Crítica',r['finding'],r['status'],r['progress']])
 for r in ideas:w.writerow([f'D{r["id"]:03}','Dataset',r['title'],r['status'],r['reason']])
print(json.dumps(summary,ensure_ascii=False))
