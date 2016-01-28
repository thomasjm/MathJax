/// <reference path="mbase_mixin.ts" />

class MTableMixin extends MBaseMixin {
    toSVG() {
        return this.SVGautoload();
    }
}
