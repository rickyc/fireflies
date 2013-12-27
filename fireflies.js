$(document).ready(function() {
  var canvas = document.getElementById('canvas');

  canvas.width = 1024;
  canvas.height = 768;
  var context = canvas.getContext('2d');

  var imgObj = new Image();
  imgObj.src = 'image.jpg';

  var ORIGINAL_DATA = null;
  var timeout = null;
  var isolated_pixels = null;

  imgObj.onload = function() {
    context.drawImage(this, 0, 0);
  };


  $("a#activate-lights").click(function(){
    if (ORIGINAL_DATA == null) {
      data = context.getImageData(0, 0, canvas.width,canvas.height);
      ORIGINAL_DATA = data;
    }
    if (isolated_pixels == null) {
      yuv_data = image_from_rgb_to_yuv(ORIGINAL_DATA.data);
      isolated_pixels = isolate_red(yuv_data);
      flat_array = image_to_2d_array(isolated_pixels, canvas.width, canvas.height);
    }

    // misc
    contig_obj = {};

    for (x = 0; x < flat_array.length; x++) {
      for (y = 0; y < flat_array[0].length; y++) {
        if (contig_obj[x + "," + y] != undefined) continue;
        points = Object.keys(get_contigious(flat_array, x, y));
        // set points into memory map / lookup table
        for (i = 0; i < points.length; i++) { contig_obj[points[i]] = points; }
      }
    }

    timeout = setInterval(function() {
      flicker();
    }, 0.001);
  });


  function image_from_rgb_to_yuv(image) {
      var ary = [];
      var i = 0;
      while (i < image.length) {
        yuv = rgb_to_yuv(image[i],image[i+1],image[i+2])
        ary[i] = yuv[0];
        ary[i + 1] = yuv[1];
        ary[i + 2] = yuv[2];
        ary[i + 3] = 255;
        i += 4;
      }
      return ary;
  }

  function flicker() {
    img = context.createImageData(canvas.width, canvas.height);

    var keys = Object.keys(contig_obj);
    var points = [];

    for (i = 0; i < 25; i++) {
      points.push.apply(points, contig_obj[keys[parseInt(Math.random()*keys.length)]]);
    }

    //points = Object.keys(get_contigious(flat_array, randX, randY));

    // 0,58
    // color it red
    //for(i=0;i<points.length;i++) {
    //  var point = points[i].split(',');
    //  var x = point[0];
    //  var y = point[1];

    //  img.data[(y*canvas.width*4)+(x*4)] = 255;
    //  img.data[(y*canvas.width*4)+(x*4)+1] = 0;
    //  img.data[(y*canvas.width*4)+(x*4)+2] = 0;
    //}

    var current_image_data = context.getImageData(0, 0, canvas.width, canvas.height);
    for(i = 0; i < img.data.length; i++)
      img.data[i] = current_image_data.data[i];

    var factor = 1 - Math.random() * 0.25 + Math.random() * 0.25;

    for(i = 0; i < points.length; i++) {
      var point = points[i].split(',');
      var x = point[0];
      var y = point[1];

      var pos = (y * canvas.width * 4) + (x * 4);

      img.data[pos]   = data.data[pos]     * factor;
      img.data[pos+1] = data.data[pos + 1] * factor;
      img.data[pos+2] = data.data[pos + 2] * factor;
      img.data[pos+3] = 255;
    }

    //img = adjust_luminosity(isolated_pixels, img, ORIGINAL_DATA, factor);
    context.putImageData(img, 0, 0);
  }

  function adjust_luminosity(isolated_pixels, img, data, factor) {
    for(i = 0; i < isolated_pixels.length; i += 4) {
      if (isolated_pixels[i] == 255) {
        img.data[i]     = data.data[i]     * factor;
        img.data[i + 1] = data.data[i + 1] * factor;
        img.data[i + 2] = data.data[i + 2] * factor;
        img.data[i + 3] = 255;
      } else {
        img.data[i]     = data.data[i];
        img.data[i + 1] = data.data[i + 1];
        img.data[i + 2] = data.data[i + 2];
        img.data[i + 3] = 255;
      }
    }
    return img;
  }

  function rgb_to_yuv(r,g,b) {
    y =  (0.257 * r) + (0.504 * g) + (0.098 * b) + 16
    u = -(0.148 * r) - (0.291 * g) + (0.439 * b) + 128
    v =  (0.439 * r) - (0.368 * g) - (0.071 * b) + 128
    return [y,u,v]
  }

  function isolate_red(image) {
    var ary = []

    for (i = 0; i < image.length; i += 4) {
      tVal = Math.sqrt(Math.pow(0 - image[i], 2) + Math.pow(255 - image[i + 1], 2))

      if (tVal < 180) {
        ary[i]     = 0;
        ary[i + 1] = 0;
        ary[i + 2] = 0;
      } else {
        ary[i]     = 255;
        ary[i + 1] = 255;
        ary[i + 2] = 255;
      }
    }

    return ary;
  }

  function image_to_2d_array(image, width, height) {
    var ary = [];

    for(x = 0; x < width; x++) {
      ary[x] = [];
      for(y = 0; y < height; y++) {
        var start_loc = (width * y * 4) + (x * 4);
        ary[x][y] = [
          image[start_loc],
          image[start_loc + 1],
          image[start_loc + 2],
          image[start_loc + 3]
        ];
      }
    }
    return ary;
  }

  function get_contigious(data, x, y) {
    var stack = [x + "," + y];
    var valid = {};

    while (stack.length > 0) {
      var obj = stack.pop();
      if (valid[obj]) continue;

      var split = obj.split(',')
      var x = parseInt(split[0]);
      var y = parseInt(split[1]);

      // first channel is white
      if (data[x] == undefined || data[x][y] == undefined) continue;
      if (data[x][y][0] == 255) {
        valid[x+","+y] = true;
        stack.push((x)+","+(y-1));
        stack.push((x-1)+","+(y));
        stack.push((x+1)+","+(y));
        stack.push((x)+","+(y+1));
      }
    }

    return valid;
  }
});
