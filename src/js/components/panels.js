import i18n from 'mi18n';
import Sortable from 'sortablejs';
import helpers from '../common/helpers';
import DOM from '../common/dom';
import {data} from '../common/data';
const dom = new DOM();

const defaults = {
  type: 'field'
};

/**
 * Edit and control sliding panels
 */
export default class Panels {
 /**
 * Panels initial setup
 * @param  {Object} options Panels config
 * @return {Object} Panels
 */
  constructor(options) {
    let _this = this;
    _this.opts = Object.assign({}, defaults, options);

    _this.labels = _this.panelNav();
    let panels = _this.panelsWrap();

    _this.panels = panels.childNodes;
    _this.currentPanel = _this.panels[0];
    _this.nav = _this.navActions();
    if (_this.opts.type === 'field') {
      setTimeout(_this.setPanelsHeight.bind(_this), 10);
    }

    return {
      content: [_this.labels, panels],
      nav: _this.nav,
      actions: {
        resize: _this.resizePanels.bind(_this)
      }
    };
  }

  /**
   * Resize the panel after its contents change in height
   * @return {String} panel's height in pixels
   */
  resizePanels() {
    let panelStyle = this.panelsWrap.style;
    return panelStyle.height = dom.getStyle(this.currentPanel, 'height');
  }

  /**
   * Set panel height so we can animate it with css
   */
  setPanelsHeight() {
    let field = document.getElementById(this.opts.id);
    this.slideToggle = field.querySelector('.field-edit');

    // temp styles
    this.slideToggle.style.display = 'block';
    this.slideToggle.style.position = 'absolute';
    this.slideToggle.style.opacity = 0;

    this.resizePanels();

    // reset styles
    this.slideToggle.style.display = 'none';
    this.slideToggle.style.position = 'relative';
    this.slideToggle.style.opacity = 1;
    this.slideToggle.style.height = 'auto';
  }

  /**
   * Wrap a panel and make properties sortable
   * if the panel belongs to a field
   * @return {Object} DOM element
   */
  panelsWrap() {
    this.panelsWrap = dom.create({
      tag: 'div',
      attrs: {
        className: 'panels'
      },
      content: this.opts.panels
    });

    this.panelsWrap = this.panelsWrap;

    if (this.opts.type === 'field') {
      this.sortableProperties(this.panelsWrap);
    }

    return this.panelsWrap;
  }

  /**
   * Sortable panel properties
   * @param  {Array} panels
   * @return {Array} panel groups
   */
  sortableProperties(panels) {
    let _this = this;
    let groups = panels.getElementsByClassName('field-edit-group');

    return helpers.forEach(groups, function(index, group) {
      if (group.isSortable) {
        let changeCallback = (evt) => {
          _this.propertySave(group);
          _this.resizePanels();
        };
        group.fieldID = _this.opts.id;
        Sortable.create(group, {
          animation: 150,
          group: {
            name: 'edit-' + group.editGroup,
            pull: true, put: ['properties']
          },
          sort: true,
          handle: '.prop-order',
          onAdd: changeCallback,
          onUpdate: changeCallback
        });
      }
    });
  }

  /**
   * Save a fields' property
   * @param  {Object} group property group
   * @return {Object}       DOM node for updated property preview
   */
  propertySave(group) {
    data.saveOrder(group.editGroup, group);
    data.save(group.editGroup, group.fieldID);
    return this.opts.updatePreview();
  }

  /**
   * Panel navigation, tabs and arrow buttons for slider
   * @return {Object} DOM object for panel navigation wrapper
   */
  panelNav() {
    let panelNavUL = {
        tag: 'div',
        attrs: {
          className: 'panel-labels'
        },
        content: {
          tag: 'div',
          content: []
        }
      };
    let panels = this.opts.panels.slice(); // make new array

    for (let i = 0; i < panels.length; i++) {
      let group = {
        tag: 'h5'
      };

      if (panels[i].config) {
        if (panels[i].config.label) {
          group.content = panels[i].config.label;
          delete panels[i].config;
        }
      }

      if (panels[i].label) {
        if (panels[i].label) {
          group.content = panels[i].label;
          delete panels[i].label;
        }
      }

      panelNavUL.content.content.push(group);
    }

    let next = {
        tag: 'button',
        attrs: {
          className: 'btn next-group',
          title: i18n.get('controlGroups.nextGroup'),
          type: 'button'
        },
        dataset: {
          toggle: 'tooltip',
          placement: 'top'
        },
        action: {
          click: (e) => this.nav.nextGroup(e)
        },
        content: dom.icon('triangle-right')
      };
    let prev = {
        tag: 'button',
        attrs: {
          className: 'btn prev-group',
          title: i18n.get('controlGroups.prevGroup'),
          type: 'button'
        },
        dataset: {
          toggle: 'tooltip',
          placement: 'top'
        },
        action: {
          click: (e) => this.nav.prevGroup(e)
        },
        content: dom.icon('triangle-left')
      };

    return dom.create({
      tag: 'nav',
      attrs: {
        className: 'panel-nav'
      },
      content: [prev, panelNavUL, next]
    });
  }

  /**
   * Handlers for navigating between panel groups
   * @todo refactor to use requestAnimationFrame instead of css transitions
   * @return {Object} actions that control panel groups
   */
  navActions() {
    let action = {};
    let groupParent = this.currentPanel.parentElement;
    let firstControlNav = this.labels.querySelector('.panel-labels').firstChild;
    let siblingGroups = this.currentPanel.parentElement.children;
    let index = Array.prototype.indexOf.call(siblingGroups, this.currentPanel);
    let offset = {};

    const groupChange = (newIndex) => {
      this.currentPanel = siblingGroups[newIndex];
      this.panelsWrap.style.height = dom.getStyle(this.currentPanel, 'height');
      if (this.opts.type === 'field') {
        this.slideToggle.style.height = 'auto';
      }
    };

    const translateX = offset => {
      firstControlNav.style.transform = `translateX(-${offset.nav}px)`;
      groupParent.style.transform = `translateX(-${offset.panel}px)`;
    };

    action.refresh = () => {
      offset = {
        nav: firstControlNav.offsetWidth * index,
        panel: groupParent.offsetWidth * index
      };
      translateX(offset);
    };

    /**
     * Slides panel to the next group
     * @return {Object} current group after navigation
     */
    action.nextGroup = () => {
      let newIndex = index + 1;
      if (newIndex !== siblingGroups.length) {
        offset = {
          nav: firstControlNav.offsetWidth * newIndex,
          panel: groupParent.offsetWidth * newIndex
        };
        translateX(offset);
        groupChange(newIndex);
        index++;
      } else {
        let origOffset = {
          nav: firstControlNav.style.transform,
          panel: groupParent.style.transform
        };
        offset = {
          nav: (firstControlNav.offsetWidth * index) + 10,
          panel: (groupParent.offsetWidth * index) + 10
        };
        translateX(offset);
        setTimeout(() => {
          firstControlNav.style.transform = origOffset.nav;
          groupParent.style.transform = origOffset.panel;
        }, 150);
      }

      return this.currentPanel;
    };

    action.prevGroup = () => {
      if (index !== 0) {
        let newIndex = (index - 1);
        offset = {
          nav: firstControlNav.offsetWidth * newIndex,
          panel: groupParent.offsetWidth * newIndex
        };
        translateX(offset);
        groupChange(newIndex);
        index--;
      } else {
        let curTranslate = [
            firstControlNav.style.transform,
            groupParent.style.transform
          ];
        let nudge = 'translateX(10px)';
        firstControlNav.style.transform = nudge;
        groupParent.style.transform = nudge;
        setTimeout(() => {
          firstControlNav.style.transform = curTranslate[0];
          groupParent.style.transform = curTranslate[1];
        }, 150);
      }
    };

    return action;
  }

}
