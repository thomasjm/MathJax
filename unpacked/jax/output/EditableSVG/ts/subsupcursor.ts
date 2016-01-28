class SubSupCursor {
    static cursorable = true;
    // TODO: make cursoring less messy

    // TODO: Make this a mixin that gets added to munderover and msubsup
    data: any;
    sub: any;
    sup: any;
    base: any;
    parent: any;
    endingPos: any;

    // TODO: this one is on munderover
    rightMoveStay: any;

    moveCursorFromParent(cursor, direction) {
        var direction = Util.getCursorValue(direction);
        var dest;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
            dest = this.data[this.base]
            if (dest.cursorable) {
                return dest.moveCursorFromParent(cursor, direction)
            }
            cursor.position = {
                section: this.base,
                pos: direction === Direction.LEFT ? 1 : 0,
            }
        } else if (direction === Direction.UP || direction === Direction.DOWN) {
            var small = direction === Direction.UP ? this.sub : this.sup
            var baseBB = this.data[this.base].getSVGBBox()
            if (!baseBB || !cursor.renderedPosition) {
                cursor.position = {
                    section: this.data[small] ? small : this.base,
                    pos: 0,
                }
            } else if (cursor.renderedPosition.x > baseBB.x+baseBB.width && this.data[small]) {
                if (this.data[small].cursorable) {
                    return this.data[small].moveCursorFromParent(cursor, direction)
                }
                var bb = this.data[small].getSVGBBox()
                cursor.position = {
                    section: small,
                    pos: cursor.renderedPosition.x > bb.x + bb.width/2 ? 1 : 0,
                }
            } else {
                if (this.data[this.base].cursorable) {
                    return this.data[this.base].moveCursorFromParent(cursor, direction)
                }
                cursor.position = {
                    section: this.base,
                    pos: cursor.renderedPosition.x > baseBB.x+baseBB.width/2 ? 1 : 0,
                }
            }
        }
        cursor.moveTo(this, cursor.position)
        return true;
    }

    moveCursorFromChild(cursor, direction, child) {
        direction = Util.getCursorValue(direction)
        var section, pos;

        var childIdx
        for (childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx]) break
        }
        if (childIdx === this.data.length) throw new Error('Unable to find specified child in children')
        var currentSection = childIdx
        var old = [cursor.node, cursor.position]
        cursor.moveTo(this, {
            section: currentSection,
            pos: direction === Direction.RIGHT ? 1 : 0,
        })

        if (!this.moveCursor(cursor, direction)) {
            cursor.moveTo.apply(cursor, old)
            return false
        }
        return true
    }

    moveCursorFromClick(cursor, x, y) {
        var base = this.data[0]
        var baseBB = base.getSVGBBox();
        var sub = this.data[this.sub];
        var subBB = sub && sub.getSVGBBox();
        var sup = this.data[this.sup];
        var supBB = sup && sup.getSVGBBox();

        var section;
        var pos;

        // If the click is somewhere within the sup or sup, go there
        if (subBB && Util.boxContains(subBB, x, y)) {
            if (sub.cursorable) {
                return sub.moveCursorFromClick(cursor, x, y)
            }
            section = this.sub;
            var midpoint = subBB.x + (subBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        } else if (supBB && Util.boxContains(supBB, x, y)) {
            if (sup.cursorable) {
                return sup.moveCursorFromClick(cursor, x, y)
            }
            section = this.sup;
            var midpoint = supBB.x + (supBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        } else {
            // Click somewhere else, go by the midpoint
            if (base.cursorable) {
                return base.moveCursorFromClick(cursor, x, y)
            }
            section = this.base;
            var midpoint = baseBB.x + (baseBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }

        cursor.moveTo(this, {
            section: section,
            pos: pos,
        });
    }

    moveCursor(cursor, direction) {
        direction = Util.getCursorValue(direction);

        var sup = this.data[this.sup]
        var sub = this.data[this.sub]

        if (cursor.position.section === this.base) {
            if (direction === Direction.UP) {
                if (sup) {
                    if (sup.cursorable) {
                        return sup.moveCursorFromParent(cursor, direction)
                    }
                    cursor.position = {
                        section: this.sup,
                        pos: 0,
                    }
                } else {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
            } else if (direction === Direction.DOWN) {
                if (sub) {
                    if (sub.cursorable) {
                        return sub.moveCursorFromParent(cursor, direction)
                    }
                    cursor.position = {
                        section: this.sub,
                        pos: 0,
                    }
                } else {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
            } else {
                if (direction === Direction.LEFT && cursor.position.pos === 0 || direction === Direction.RIGHT && cursor.position.pos === 1) {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
                cursor.position.pos = cursor.position.pos ? 0 : 1
            }
        } else {
            var vertical = direction === Direction.UP || direction === Direction.DOWN
            var movingInVertically = vertical && (direction === Direction.UP) === (cursor.position.section === this.sub)
            var movingInHorizontally = cursor.position.pos === 0 && direction === Direction.LEFT
            var moveRightHorizontally = cursor.position.pos === 1 && direction === Direction.RIGHT
            var movingAway = vertical ? !movingInVertically : !this.rightMoveStay && moveRightHorizontally
            var movingIn = movingInVertically || movingInHorizontally || moveRightHorizontally && this.rightMoveStay
            if (movingAway) {
                return this.parent.moveCursorFromChild(cursor, direction, this)
            } else if (movingIn) {
                if (this.data[this.base].cursorable) {
                    return this.data[this.base].moveCursorFromParent(cursor, cursor.position.section === this.sub ? Direction.UP : Direction.DOWN)
                }
                cursor.position = {
                    section: this.base,
                    pos: moveRightHorizontally ? 1 : this.endingPos || 0,
                }
            } else {
                cursor.position.pos = cursor.position.pos ? 0 : 1
            }
        }

        cursor.moveTo(this, cursor.position)
        return true
    }

    drawCursor(cursor) {
        var bb;
        var x, y, height;

        if (cursor.position.section === this.base) {
            bb = this.data[this.base].getSVGBBox()
            var mainBB = this.getSVGBBox()
            y = mainBB.y
            height = mainBB.height
        } else {
            bb = this.data[cursor.position.section].getSVGBBox()
            y = bb.y
            height = bb.height
        }

        x = cursor.position.pos === 0 ? bb.x : bb.x + bb.width;

        var svgelem = this.EditableSVGelem.ownerSVGElement
        return cursor.drawAt(svgelem, x, y, height)
    }
}
