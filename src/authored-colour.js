// With soft lighting on, the finished picture is tone-mapped as a whole. A few
// things are authored as final screen colours and must not shift: the cinema
// screen, flames, the telescope's posters and the sky. For those, the exact
// inverse of the renderer's ACES curve is applied first, so the later tone
// mapping returns the colour that was authored.
export const hdrOutput={value:0},hdrExposure={value:1.05};
export const AUTHORED_COLOUR_GLSL=`uniform float uHdrOutput;uniform float uHdrExposure;
vec3 authoredToScene(vec3 colour){
 if(uHdrOutput<.5)return colour;
 const mat3 inputInverse=mat3(vec3(1.764741,-0.147028,-0.036337),vec3(-0.675778,1.160252,-0.162436),vec3(-0.088963,-0.013224,1.198773));
 const mat3 outputInverse=mat3(vec3(0.643038,0.059269,0.005962),vec3(0.311187,0.931436,0.063929),vec3(0.045775,0.009295,0.930118));
 vec3 y=clamp(outputInverse*colour,0.,.985);
 vec3 a=.983729*y-1.,b=.432951*y-.0245786,c=.238081*y+.000090537;
 vec3 fitted=(-b-sqrt(max(b*b-4.*a*c,0.)))/(2.*a);
 return max(inputInverse*fitted,0.)*.6/uHdrExposure;
}`;
// For built-in materials created with toneMapped:false.
export function keepAuthoredColour(material){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);shader.uniforms.uHdrOutput=hdrOutput;shader.uniforms.uHdrExposure=hdrExposure;
  shader.fragmentShader=AUTHORED_COLOUR_GLSL+'\n'+shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb=authoredToScene(gl_FragColor.rgb);');
 };
 material.customProgramCacheKey=()=>key+'-authored-colour-v1';material.needsUpdate=true;return material;
}
