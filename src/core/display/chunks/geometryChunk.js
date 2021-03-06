/**
 *  Create display state chunk type for draw and pick render of geometry
 */
SceneJS_ChunkFactory.createChunkType({

    type: "geometry",

    build: function () {

        var draw = this.program.draw;

        this._aRegionMapUVDraw = draw.getAttribute("SCENEJS_aRegionMapUV");
        this._aVertexDraw = draw.getAttribute("SCENEJS_aVertex");
        this._aNormalDraw = draw.getAttribute("SCENEJS_aNormal");
        this._aUVDraw = draw.getAttribute("SCENEJS_aUVCoord");
        this._aUV2Draw = draw.getAttribute("SCENEJS_aUVCoord2");
        this._aTangentDraw = draw.getAttribute("SCENEJS_aTangent");
        this._aColorDraw = draw.getAttribute("SCENEJS_aVertexColor");

        this._aMorphVertexDraw = draw.getAttribute("SCENEJS_aMorphVertex");
        this._aMorphNormalDraw = draw.getAttribute("SCENEJS_aMorphNormal");
        this._uMorphFactorDraw = draw.getUniform("SCENEJS_uMorphFactor");

        var pick = this.program.pick;

        this._aRegionMapUVPick = pick.getAttribute("SCENEJS_aRegionMapUV");
        this._aVertexPick = pick.getAttribute("SCENEJS_aVertex");
        this._aColorPick = pick.getAttribute("SCENEJS_aColor");
        this._aMorphVertexPick = pick.getAttribute("SCENEJS_aMorphVertex");
        this._uMorphFactorPick = pick.getUniform("SCENEJS_uMorphFactor");

        this.VAO = null;
        this.VAOMorphKey1 = 0;
        this.VAOMorphKey2 = 0;
        this.VAOHasInterleavedBuf = false;
    },

    recycle: function () {
        if (this.VAO) {
            // Guarantee that the old VAO is deleted immediately when recycling the object.
            var VAOExt = this.program.gl.getExtension("OES_vertex_array_object");
            VAOExt.deleteVertexArrayOES(this.VAO);
            this.VAO = null;
        }
    },

    morphDraw: function () {
        this.VAOMorphKey1 = this.core.key1;
        this.VAOMorphKey2 = this.core.key2;

        var target1 = this.core.targets[this.core.key1]; // Keys will update
        var target2 = this.core.targets[this.core.key2];

        if (this._aMorphVertexDraw) {
            this._aVertexDraw.bindFloatArrayBuffer(target1.vertexBuf);
            this._aMorphVertexDraw.bindFloatArrayBuffer(target2.vertexBuf);
        } else if (this._aVertexDraw) {
            this._aVertexDraw.bindFloatArrayBuffer(this.core2.vertexBuf);
        }

        if (this._aMorphNormalDraw) {
            this._aNormalDraw.bindFloatArrayBuffer(target1.normalBuf);
            this._aMorphNormalDraw.bindFloatArrayBuffer(target2.normalBuf);
        } else if (this._aNormalDraw) {
            this._aNormalDraw.bindFloatArrayBuffer(this.core2.normalBuf);
        }

        if (this._aUVDraw) {
            this._aUVDraw.bindFloatArrayBuffer(this.core2.uvBuf);
        }

        if (this._aUV2Draw) {
            this._aUV2Draw.bindFloatArrayBuffer(this.core2.uvBuf2);
        }

        if (this._aColorDraw) {
            this._aColorDraw.bindFloatArrayBuffer(this.core2.colorBuf);
        }

        this.setDrawMorphFactor();
    },

    setDrawMorphFactor: function () {

        if (this._uMorphFactorDraw) {
            this._uMorphFactorDraw.setValue(this.core.factor); // Bind LERP factor
        }

    },

    draw: function (frameCtx) {
        var doMorph = this.core.targets && this.core.targets.length;
        var cleanInterleavedBuf = this.core2.interleavedBuf && !this.core2.interleavedBuf.dirty;

        if (this.VAO) {
            frameCtx.VAO.bindVertexArrayOES(this.VAO);
            if (doMorph) {
                if (this.VAOMorphKey1 == this.core.key1 && this.VAOMorphKey2 == this.core.key2) {
                    this.setDrawMorphFactor();
                    return;
                }
            } else if (cleanInterleavedBuf || !this.VAOHasInterleavedBuf) {
                return;
            }
        } else if (frameCtx.VAO) {
            // Start creating a new VAO by switching to the default VAO, which doesn't have attribs enabled.
            frameCtx.VAO.bindVertexArrayOES(null);
            this.VAO = frameCtx.VAO.createVertexArrayOES();
            frameCtx.VAO.bindVertexArrayOES(this.VAO);
        }

        if (doMorph) {
            this.morphDraw();
        } else {
            if (cleanInterleavedBuf) {
                this.VAOHasInterleavedBuf = true;
                this.core2.interleavedBuf.bind();
                if (this._aVertexDraw) {
                    this._aVertexDraw.bindInterleavedFloatArrayBuffer(3, this.core2.interleavedStride, this.core2.interleavedPositionOffset);
                }
                if (this._aNormalDraw) {
                    this._aNormalDraw.bindInterleavedFloatArrayBuffer(3, this.core2.interleavedStride, this.core2.interleavedNormalOffset);
                }
                if (this._aUVDraw) {
                    this._aUVDraw.bindInterleavedFloatArrayBuffer(2, this.core2.interleavedStride, this.core2.interleavedUVOffset);
                }
                if (this._aUV2Draw) {
                    this._aUV2Draw.bindInterleavedFloatArrayBuffer(2, this.core2.interleavedStride, this.core2.interleavedUV2Offset);
                }
                if (this._aColorDraw) {
                    this._aColorDraw.bindInterleavedFloatArrayBuffer(4, this.core2.interleavedStride, this.core2.interleavedColorOffset);
                }
                if (this._aTangentDraw) {

                    // Lazy-compute tangents as soon as needed.
                    // Unfortunately we can't include them in interleaving because that happened earlier.
                    this._aTangentDraw.bindFloatArrayBuffer(this.core2.tangentBuf || this.core2.getTangents());
                }
            } else {
                this.VAOHasInterleavedBuf = false;
                if (this._aVertexDraw) {
                    this._aVertexDraw.bindFloatArrayBuffer(this.core2.vertexBuf);
                }
                if (this._aNormalDraw) {
                    this._aNormalDraw.bindFloatArrayBuffer(this.core2.normalBuf);
                }
                if (this._aUVDraw) {
                    this._aUVDraw.bindFloatArrayBuffer(this.core2.uvBuf);
                }
                if (this._aUV2Draw) {
                    this._aUV2Draw.bindFloatArrayBuffer(this.core2.uvBuf2);
                }
                if (this._aColorDraw) {
                    this._aColorDraw.bindFloatArrayBuffer(this.core2.colorBuf);
                }
                if (this._aTangentDraw) {

                    // Lazy-compute tangents
                    this._aTangentDraw.bindFloatArrayBuffer(this.core2.tangentBuf || this.core2.getTangents());
                }
            }
        }

        if (this._aRegionMapUVDraw) {
            this._aRegionMapUVDraw.bindFloatArrayBuffer(this.core2.uvBuf);
        }

        this.core2.indexBuf.bind();

    },

    morphPick: function (frameCtx) {

        var core = this.core;
        var core2 = this.core2;

        var target1 = core.targets[core.key1];
        var target2 = core.targets[core.key2];

        if (frameCtx.pickObject || frameCtx.pickRegion) {

            if (this._aMorphVertexPick) {

                this._aVertexPick.bindFloatArrayBuffer(target1.vertexBuf);
                this._aMorphVertexPick.bindFloatArrayBuffer(target2.vertexBuf);

            } else if (this._aVertexPick) {
                this._aVertexPick.bindFloatArrayBuffer(core2.vertexBuf);
            }

            core2.indexBuf.bind();

        } else if (frameCtx.pickTriangle) {

            if (this._aMorphVertexPick) {

                var pickPositionsBuf = core.getPickPositions(core.key1, core2.arrays.indices);
                if (pickPositionsBuf) {
                    this._aVertexPick.bindFloatArrayBuffer(pickPositionsBuf);
                }

                pickPositionsBuf = core.getPickPositions(core.key2, core2.arrays.indices);
                if (pickPositionsBuf) {
                    this._aMorphVertexPick.bindFloatArrayBuffer(pickPositionsBuf);
                }

                if (this._aColorPick) {
                    this._aColorPick.bindFloatArrayBuffer(core2.getPickColors());
                }

                var pickIndicesBuf = core2.getPickIndices();
                if (pickIndicesBuf) {
                    pickIndicesBuf.bind()
                }

            } else if (this._aVertexPick) {

                this._aVertexPick.bindFloatArrayBuffer(core2.vertexBuf);

                core2.indexBuf.bind();
            }
        }

        if (this._uMorphFactorPick) {
            this._uMorphFactorPick.setValue(core.factor);
        }
    },

    pick: function (frameCtx) {

        var core = this.core;
        var core2 = this.core2;

        if (core.targets && core.targets.length) {

            this.morphPick(frameCtx);

        } else {

            if (frameCtx.pickObject || frameCtx.pickRegion) {

                if (this._aVertexPick) {
                    this._aVertexPick.bindFloatArrayBuffer(core2.vertexBuf);
                }

                if (this._aRegionMapUVPick) {
                    this._aRegionMapUVPick.bindFloatArrayBuffer(core2.uvBuf);
                }

                core2.indexBuf.bind();

            } else if (frameCtx.pickTriangle) {

                if (this._aVertexPick) {
                    this._aVertexPick.bindFloatArrayBuffer(core2.getPickPositions());
                }

                if (this._aColorPick) {
                    this._aColorPick.bindFloatArrayBuffer(core2.getPickColors());
                }

                var pickIndices = core2.getPickIndices();

                if (pickIndices) {
                    pickIndices.bind()
                }

            }
        }
    }
});
