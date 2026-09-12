// Each portrait has one continuous silhouette per scanline. Keep the span
// between its visible edges opaque, including black hair connected to the
// background. Flood filling by luminance would eat into that hair.
export function maskPortraitBackground(data, width, height, columns=4, rows=3) {
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const x0=Math.round(col*width/columns),x1=Math.round((col+1)*width/columns);
    const y0=Math.round(row*height/rows),y1=Math.round((row+1)*height/rows);
    for(let y=y0;y<y1;y++){
      let left=x1,right=x0-1;
      for(let x=x0;x<x1;x++){
        const i=(y*width+x)*4;
        if(Math.max(data[i],data[i+1],data[i+2])>8){left=Math.min(left,x);right=x;}
      }
      for(let x=x0;x<x1;x++)if(x<left||x>right)data[(y*width+x)*4+3]=0;
    }
  }
  return data;
}
