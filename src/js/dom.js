import helpers from './helpers';
import animate from './animation';
import { dataMap } from './data';

export default class DOM {
  constructor() {}

  create(elem, isPreview = false) {
    let _this = this,
      contentType,
      tag = elem.tag || elem,
      processed = [],
      i,
      wrap,
      labelAfter = (elem) => {
        let type = helpers.get(elem, 'attrs.type');
        return (type === 'checkbox' || type === 'radio');
      },
      isInput = (['input', 'textarea', 'select'].indexOf(tag) !== -1),
      element = document.createElement(tag),
      holdsContent = (element.outerHTML.indexOf('/') !== -1),
      /**
       * Object for mapping contentType to its function
       * @type {Object}
       */
      appendContent = {
        string: (content) => {
          element.innerHTML += content;
        },
        object: (content) => {
          return element.appendChild(_this.create(content));
        },
        node: (content) => {
          return element.appendChild(content);
        },
        array: (content) => {
          for (var i = 0; i < content.length; i++) {
            contentType = _this.contentType(content[i]);
            appendContent[contentType](content[i]);
          }
        },
        undefined: () => {
          console.error(elem);
        }
      };

    processed.push('tag');


    // Append Element Content
    if (elem.options) {
      let options = this.processOptions(elem);
      if (holdsContent && tag !== 'button' ) {
        // mainly used for <select> tag
        appendContent.array.call(this, options);
        delete elem.content;
      } else {

        wrap = {
          tag: 'div',
          className: helpers.get(elem, 'config.inputWrap') || 'form-group',
          content: []
        };

        helpers.forEach(options, (i) => {
          wrap.content.push(_this.create(options[i], isPreview));
        });

        return this.create(wrap, isPreview);
      }

      processed.push('options');
    }

    // check for root className property
    if (elem.className) {
      elem.attrs = Object.assign({}, elem.attrs, { className: elem.className });
      elem.attrs.className = elem.className;
      delete elem.className;
    }

    // Set element attributes
    if (elem.attrs) {
      _this.processAttrs(elem, element);
      processed.push('attrs');
    }

    if (elem.config) {
      if (elem.config.label && tag !== 'button') {
        wrap = {
          tag: 'div',
          className: helpers.get(elem, 'config.inputWrap') || 'form-group',
          content: []
        };

        let label;

        if (isPreview) {
          label = _this.label(elem, 'config.label');
        } else {
          label = _this.label(elem);
        }

        if (labelAfter(elem)) {
          wrap.content.push(element, ' ', label);
        } else {
          wrap.content.push(label, element);
        }

      }

      processed.push('config');
    }

    // Append Element Content
    if (elem.content) {
      contentType = _this.contentType(elem.content);
      appendContent[contentType].call(this, elem.content);
      processed.push('content');
    }

    // Set the new element's dataset
    if (elem.dataset) {
      for (var data in elem.dataset) {
        if (elem.dataset.hasOwnProperty(data)) {
          element.dataset[data] = elem.dataset[data];
        }
      }
      processed.push('dataset');
    }

    // Add listeners for defined actions
    if (elem.action) {
      let actions = Object.keys(elem.action);
      for (i = actions.length - 1; i >= 0; i--) {
        let event = actions[i];
        element.addEventListener(event, (evt) => { elem.action[event](evt) });
      }
      processed.push('action');
    }

    let fieldDataBindings = [
      'row',
      'column',
      'field'
    ];

    if (helpers.inArray(elem.fType, fieldDataBindings)) {
      element.fieldData = elem;
      processed.push('fieldData');
    }

    // Subtract processed and ignored and attach the rest
    let remaining = Object.keys(elem).subtract(processed);
    for (i = remaining.length - 1; i >= 0; i--) {
      element[remaining[i]] = elem[remaining[i]];
    }

    if (wrap) {
      element = this.create(wrap);
    }

    return element;
  }

  icon(name) {
    return '<svg class="svg-icon icon-' + name + '"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-' + name + '"></use></svg>';
  }

  processAttrs(elem, element) {
    // Set element attributes
    for (var attr in elem.attrs) {
      if (elem.attrs.hasOwnProperty(attr)) {
        if (elem.attrs[attr]) {
          let name = helpers.safeAttrName(attr),
            value = elem.attrs[attr] || '';

          if (Array.isArray(value)) {
            value = value.join(' ');
          }

          element.setAttribute(name, value);
        }
      }
    }

  }

  processOptions(elem) {
    let fieldType = helpers.get(elem, 'attrs.type') || 'select';

    let optionMap = (option) => {
      let defaultInput = {
        tag: 'input',
        attrs: {
          name: elem.id,
          id: null,
          type: fieldType
        },
        config: {
          inputWrap: fieldType,
          label: option.label
        }
      };

      let optionMarkup = {
        select: {
          tag: 'option',
          attrs: option,
          content: option.label
        },
        button: Object.assign({}, elem, {options: undefined}),
        checkbox: defaultInput,
        radio: defaultInput
      };

      delete optionMarkup[fieldType].attrs.label;

      return optionMarkup[fieldType];
    };

    return elem.options.map(optionMap);
  }

  label(elem, fMap) {
    let type = helpers.get(elem, 'attrs.type'),
      fieldLabel = {
        tag: 'label',
        attrs: {},
        content: [elem.config.label],
        action: {}
      };

    if (type !== 'radio' && type !== 'checkbox') {
      fieldLabel.attrs.for = elem.id || '';
    }

    if (fMap) {
      fieldLabel.attrs.contenteditable = true;
      fieldLabel.action.click = function(e) {
        if (e.target.contentEditable === 'true') {
          e.preventDefault();
        }
      };
      fieldLabel.fMap = fMap;
    }

    return fieldLabel;
  }

  /**
   * Determine content type
   * @param  {Node | String | Array | Object} content
   * @return {String}                         contentType for mapping
   */
  contentType(content) {
    let type = typeof content;
    if (content instanceof Node || content instanceof HTMLElement) {
      type = 'node';
    } else if (Array.isArray(content)) {
      type = 'array';
    }

    return type;
  }

  /**
   * Get computed element style
   */
  getStyle(elem, property = false) {
    var style;
    if (window.getComputedStyle) {
      style = window.getComputedStyle(elem, null);

    } else if (elem.currentStyle) {
      style = elem.currentStyle;
    }

    return property ? style[property] : style;
  }

  getElement(elem) {
    let getElement = {
        node: () => {
          return elem;
        },
        object: () => {
          return document.getElementById(elem.id);
        },
        string: () => {
          return document.getElementById(elem);
        }
      },
      type = this.contentType(elem),
      element = getElement[type]();

    return element;
  }

  actionButtons(id, item = 'column') {
    let _this = this,
      tag = (item === 'column' ? 'li' : 'div'),
      moveIcon = (item === 'row') ? _this.icon('move-vertical') : _this.icon('move'),
      btnWrap = {
        tag: 'div',
        className: 'action-btn-wrap'
      },
      menuHandle = {
        tag: 'button',
        content: [moveIcon, _this.icon('handle')],
        className: item + '-handle btn-secondary btn'
      },
      editToggle = {
        tag: 'button',
        content: _this.icon('edit'),
        className: item + '-edit-toggle btn-secondary btn',
        action: {
          click: (evt) => {
            let element = document.getElementById(id),
              editWindow = element.querySelector(`.${item}-edit`);
            animate.slideToggle(editWindow, 333);
            if (item === 'field') {
              animate.slideToggle(editWindow.nextSibling, 333);
            }
            element.classList.toggle('editing-' + item);
          }
        }
      },
      remove = {
        tag: 'button',
        content: _this.icon('remove'),
        className: item + '-remove btn-secondary btn',
        action: {
          click: () => {
            let element = document.getElementById(id);
            animate.slideUp(element, 250, (elem) => {
              let parent = elem.parentElement,
                children;
              _this.remove(elem);

              children = parent.querySelectorAll('.stage-' + item);
              if (!children.length) {
                if (parent.fType !== 'stage') {
                  _this.remove(parent);
                } else {
                  parent.classList.add('stage-empty');
                }
              }

              console.log(`${item} removed`);
            });
          }
        }
      };

    let actions = {
      tag: tag,
      className: item + '-actions group-actions',
      action: {
        mouseenter: (evt) => {
          let element = document.getElementById(id);
          element.classList.add('hovering-' + item);
          evt.target.parentReference = element;
        },
        mouseleave: (evt) => {
          // if (evt.toElement !== evt.target.parentReference) {
          evt.target.parentReference.classList.remove('hovering-' + item);
          // }
        }
      }
    };

    // if (item === 'column') {
    //   btnWrap.content = [menuHandle, remove];
    // } else {
    btnWrap.content = [menuHandle, editToggle, remove];
    // }

    actions.content = btnWrap;

    return actions;
  }

  /**
   * Removes element by reference or ID
   *
   * @param  {String | Object} elem
   */
  remove(elem) {
    let element = this.getElement(elem);
    return element.parentElement.removeChild(element);
  }

  /**
   * Removes a class or classes from nodeList
   *
   * @param  {NodeList} nodeList
   * @param  {String | Array} className
   */
  removeClasses(nodeList, className) {
    let _this = this,
      removeClass = {
        string: (elem) => {
          elem.className = elem.className.replace(className, '');
        },
        array: (elem) => {
          for (var i = className.length - 1; i >= 0; i--) {
            elem.classList.remove(className[i]);
          }
        }
      };
    removeClass.object = removeClass.string; // handles regex map
    helpers.forEach(nodeList, (i) => {
      removeClass[_this.contentType(className)](nodeList[i]);
    });
  }

  /**
   * Adds a class or classes from nodeList
   *
   * @param  {NodeList} nodeList
   * @param  {String | Array} className
   */
  addClasses(nodeList, className) {
    let _this = this,
      addClass = {
        string: (elem) => {
          elem.classList.add(className);
        },
        array: (elem) => {
          for (var i = className.length - 1; i >= 0; i--) {
            elem.classList.add(className[i]);
          }
        }
      };
    helpers.forEach(nodeList, (i) => {
      addClass[_this.contentType(className)](nodeList[i]);
    });
  }

  fieldOrder(column) {
    let fields = column.querySelectorAll('.stage-field');

    if (fields.length) {
      this.removeClasses(fields, ['first-field', 'last-field']);
      fields[0].classList.add('first-field');
      fields[fields.length - 1].classList.add('last-field');
    }
  }

  columnWidths(row) {
    let _this = this,
      columns = row.getElementsByClassName('stage-column'),
      colWidth = (12 / columns.length),
      rowStyle = _this.getStyle(row),
      bsGridRegEx = /\bcol-\w+-\d+/g,
      rowPadding = parseFloat(rowStyle.paddingLeft) + parseFloat(rowStyle.paddingRight),
      rowWidth = row.offsetWidth - rowPadding; //compensate for padding

    _this.removeClasses(columns, bsGridRegEx);

    helpers.forEach(columns, (i) => {
      let width;
      if (helpers.isInt(colWidth)) {
        width = 'col-md-' + colWidth;
        columns[i].removeAttribute('style');
        columns[i].className.replace(bsGridRegEx, ''); // removes bootstrap column classes
        columns[i].classList.add(width);
        dataMap.columns[columns[i].id].config.width = width;
      } else {
        width = (100 / columns.length);
        columns[i].style.width = width + '%';
        columns[i].style.float = 'left';
        dataMap.columns[columns[i].id].config.width = width;
      }
    });

    // This is temporary until column resizing happens on hover
    // setTimeout(() => {
    helpers.forEach(columns, (i) => {
      colWidth = (columns[i].offsetWidth / rowWidth * 100);
      columns[i].dataset.colWidth = Math.round(colWidth).toString() + '%';
    });
    // }, 10);

    return colWidth;
  }

  formGroup(content, className) {
    return {
      tag: 'div',
      className: 'form-group ' + className,
      content: content
    };
  }

  columnPresetControl(row) {
    let _this = this,
      columnSettingsPresetSelect = {
        tag: 'select',
        attrs: {
          ariaLabel: 'Define a column layout',
          className: 'form-control column-preset'
        }
      },
      presetMap = new Map();
    presetMap.set(1, [{ value: '', label: '100%' }]);
    presetMap.set(2, [{ value: '50,50', label: '50 | 50' }, { value: '33,66', label: '33 | 66' }]);
    presetMap.set(3, [{ value: '33,33,33', label: '33 | 33 | 33' }, { value: '25,50,25', label: '25 | 50 | 25' }]);
    presetMap.set(4, [{ value: '25,25,25,25', label: '25 | 25 | 25 | 25' }]);
    presetMap.set('custom', [{ value: 'custom', label: 'Custom' }]);

    if (row) {
      let columns = row.getElementsByClassName('stage-column');
      columnSettingsPresetSelect.options = presetMap.get(columns.length) || presetMap.get('custom');
    } else {
      columnSettingsPresetSelect.options = presetMap.get(1);
    }

    return columnSettingsPresetSelect;
  }

  updateColumnPreset(row) {
    let _this = this,
      oldColumnPreset = row.querySelector('.column-preset'),
      rowEdit = oldColumnPreset.parentElement,
      newColumnPreset = _this.create(_this.columnPresetControl(row));

    rowEdit.replaceChild(newColumnPreset, oldColumnPreset);
  }

  // manualColumnWidth(column, width) {
  //   let _this = this;

  //   parseFloat($(this)[0].style.height / $('#idOfFirstParent').height ()) * 100;
  // }

}
