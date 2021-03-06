// Always call setCallbacks - your callbacks may be called right away if the tile is already
// loaded, or may be called at some point in the future

var HNMegaTextureTile = function (megaTexture, level, tileX, tileY) {
    this.megaTexture = megaTexture;
    this.level = level;
    this.tileX = tileX;
    this.tileY = tileY;
    this.isLoading = true;
    this.isPresent = false;
    this.lastUse = 0; // last frame number the tile was requested on
}
HNMegaTextureTile.prototype.setCallbacks = function (target, successCallback, failureCallback) {
    if (this.isLoading == false) {
        if (this.isPresent == true) {
            successCallback.call(target, this);
        } else {
            failureCallback.call(target, this);
        }
    } else {
        this.callbackTarget = target;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }
}
HNMegaTextureTile.fromUrl = function (megaTexture, level, tileX, tileY, url) {
    var tile = new HNMegaTextureTile(megaTexture, level, tileX, tileY);
    var img = new Image();
    img.onload = function () {
        tile.isLoading = false;
        tile.isPresent = true;
        if (tile.successCallback) {
            tile.successCallback.call(tile.callbackTarget, tile);
        }
    }
    img.onerror = function () {
        tile.isLoading = false;
        tile.isPresent = false;
        if (tile.failureCallback) {
            tile.failureCallback.call(tile.callbackTarget, tile);
        }
    }
    tile.url = url;
    tile.img = img;
    return tile;
}
HNMegaTextureTile.fromCanvas = function (megaTexture, level, tileX, tileY, canvas) {
    var tile = new HNMegaTextureTile(megaTexture, level, tileX, tileY);
    tile.img = canvas;
    setTimeout(function () {
        tile.isLoading = false;
        tile.isPresent = true;
        if (tile.successCallback) {
            tile.successCallback.call(tile.callbackTarget, tile);
        }
    }, 0);
    return tile;
}
HNMegaTextureTile.createPlaceholder = function (megaTexture, level, tileX, tileY) {
    var tile = new HNMegaTextureTile(megaTexture, level, tileX, tileY);
    return tile;
}
HNMegaTextureTile.prototype.beginRequest = function (loader) {
    if (this.img) {
        this.img.src = this.url;
    } else {
        // TODO: if the browser supports sending native objects, do that instead of JSON'ing them
        con.debug("posting message to worker for tile " + this.level + "@" + this.tileX + "," + this.tileY);
        var key = [this.megaTexture.uniqueId, this.level, this.tileX, this.tileY].join(",");
        var message = {
            key: key,
            megaTexture: this.megaTexture,
            level: this.level,
            tileX: this.tileX,
            tileY: this.tileY
        };
        loader.worker.postMessage(JSON.stringify(message));
    }
}
HNMegaTextureTile.prototype.loadImageData = function (canvas) {
}
HNMegaTextureTile.prototype.loadPixels = function (width, height, pixels) {
    this.pixelArray = {
        width: width,
        height: height,
        pixels: pixels
    };
    this.isLoading = false;
    this.isPresent = true;
    if (this.successCallback) {
        this.successCallback.call(this.callbackTarget, this);
    }
}
HNMegaTextureTile.prototype.markFailed = function () {
    this.isLoading = false;
    this.isPresent = false;
    if (this.failureCallback) {
        this.failureCallback.call(this.callbackTarget, this);
    }
}
// { width:px, height:px, id:texid }
HNMegaTextureTile.prototype.uploadTexture = function (gl) {
    var id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, id);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    var width;
    var height;
    if (this.img) {
        width = this.img.width;
        height = this.img.height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    } else if (this.pixelArray) {
        width = this.pixelArray.width;
        height = this.pixelArray.height;
        var pixelData;
        if (this.pixelArray.pixels.constructor == Uint8Array) {
            pixelData = this.pixelArray.pixels;
        } else if (this.pixelArray.pixels.data) {
            // TODO: is this required with a CanvasPixelArray?
            pixelData = new Uint8Array(this.pixelArray.pixels.data);
        } else {
            pixelData = new Uint8Array(this.pixelArray.pixels);
        }
        if (pixelData) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
        }
    } else {
        con.error("unsupported tile type for upload");
        gl.deleteTexture(id);
        return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    var texture = {
        width: width,
        height: height,
        id: id,
        dispose: function () {
            gl.deleteTexture(id);
        }
    };
    return texture;
}
