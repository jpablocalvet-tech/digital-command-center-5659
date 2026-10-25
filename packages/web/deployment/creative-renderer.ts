// Original editorial compositions. No stock-photo gallery or paid generation calls.
export const escape = (s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type CreativeCopy={headline:string;body:string;cta:string;caption:string};
export type CreativeBrand={name:string;ink:string;paper:string;accent:string;logo?:string;confirmed:boolean};
export const rutaCopies:CreativeCopy[]=[
  {headline:'Un viaje empieza\ncon una buena ruta.',body:'Diseñamos el recorrido alrededor\nde tu tiempo, tu ritmo y tus intereses.',cta:'Conversemos sobre tu próximo viaje.',caption:'Antes de reservar, definamos lo que quieres vivir. En RUTA diseñamos el recorrido a tu medida: tiempos, conexiones y prioridades. Escríbenos para comenzar.'},
  {headline:'Menos traslados.\nMás viaje.',body:'Elegir bien las conexiones también\nes parte de diseñar la experiencia.',cta:'Diseñemos una ruta con sentido.',caption:'Una lista de destinos no siempre es una buena ruta. Ordenar las paradas y dar espacio a cada lugar puede cambiar la experiencia. Cuéntanos cómo te gusta viajar.'},
  {headline:'Tu ritmo.\nTu próxima ruta.',body:'Primero lo que quieres vivir.\nDespués, el recorrido.',cta:'Escríbenos para empezar.',caption:'¿Qué quieres vivir en tu próximo viaje? Empecemos por ahí. RUTA · Travel Design Studio.'},
  {headline:'Antes de reservar,\ndiseñemos.',body:'Tiempo, conexiones e intereses.\nUna ruta pensada para ti.',cta:'Hablemos de tu próximo viaje.',caption:'El diseño del viaje empieza antes de la primera reserva. Cuéntanos tu idea y demos forma al recorrido. RUTA · Travel Design Studio.'},
];
export function renderCreative(index:number,copy:CreativeCopy,brand:CreativeBrand) {
  const story=index>=2,h=story?1920:1350,dark=index%2===1;
  const bg=dark?brand.ink:brand.paper,fg=dark?brand.paper:brand.ink;
  const text=(lines:string,x:number,y:number,size:number,family='sans-serif',color=fg)=>lines.split('\n').map((line,i)=>`<text x="${x}" y="${y+i*size*1.2}" fill="${color}" font-family="${family}" font-size="${size}">${escape(line)}</text>`).join('');
  const top=story?210:115,headlineY=story?530:380,artY=story?880:680;
  const logo=brand.logo?`<rect width="1080" height="${top+100}" fill="#ffffff"/><image href="${brand.logo}" x="75" y="${top-85}" width="290" height="170" preserveAspectRatio="xMinYMid meet"/>`:text(brand.name,80,top,44,'serif');
  const contours=Array.from({length:11},(_,i)=>`<path d="M ${-80+i*28} ${artY+260+i*10} C ${300+i*12} ${artY-350+i*25}, ${600+i*35} ${artY+550-i*23}, ${1200+i*10} ${artY-70+i*25}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${h}" viewBox="0 0 1080 ${h}"><rect width="1080" height="${h}" fill="${bg}"/>
  ${logo}${brand.logo?'':text('TRAVEL DESIGN STUDIO',82,top+68,17,'sans-serif')}
  <path d="M80 ${top+130}H1000" stroke="${fg}" opacity=".3"/>
  ${text(index%2?'EL ARTE DE ELEGIR EL RECORRIDO':'VIAJAR, A TU MANERA',80,headlineY-75,18,'sans-serif',dark?brand.paper:brand.accent)}
  ${text(copy.headline,75,headlineY,70,'serif')}
  ${text(copy.body,80,headlineY+210,27)}
  <g fill="none" stroke="${fg}" stroke-width="1.1" opacity=".17">${contours}</g>
  <path d="M140 ${artY+230} C360 ${artY-170},560 ${artY+480},915 ${artY+30}" fill="none" stroke="${brand.accent}" stroke-width="4"/>
  <g fill="${bg}" stroke="${brand.accent}" stroke-width="4"><circle cx="140" cy="${artY+230}" r="12"/><circle cx="915" cy="${artY+30}" r="12"/></g>
  ${text('01 / LA IDEA',108,artY+285,17)}${text('02 / TU RUTA',800,artY-15,17)}
  <path d="M80 ${h-225}H1000" stroke="${fg}" opacity=".3"/>
  ${text(copy.cta,80,h-165,26)}<path d="M900 ${h-175}h75m-18-18 18 18-18 18" fill="none" stroke="${fg}" stroke-width="2"/>
  ${text('RUTA / DISEÑO DE VIAJES A MEDIDA',80,h-100,16)}
  ${!brand.confirmed?text('PRUEBA INTERNA · MARCA POR CONFIRMAR',80,h-52,14,'sans-serif',brand.accent):''}</svg>`;
}
