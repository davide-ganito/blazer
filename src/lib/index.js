import React from 'react';
import _ from 'lodash';
import invariant from 'invariant';

let containers = [];
let styleID = 'styler';

export default {

  setStyleID ( ID ){
    styleID = ID;
  },

  createContainer( Component, opts ) {

    const {
      styles
    } = {
      styles : {},
      ...opts
    };

    const Styler = this;

    // @todo il containerID deve essere generato univocamente dal Componente
    // così da poter utilizzare più istanze di Styler contemporaneamente
    // evitando collisioni
    //const containerID = containers.length;
    const containerID = Component.displayName || Component.name || containers.length;

    const [ fragmentKeys, classKeys ] =
      _.partition( _.keys( styles ),
        (className) => _.startsWith( className, '§' ) )

    const classes = _.pick( styles, classKeys );
    const fragments = _.pick( styles, fragmentKeys );

    const classNames = _.keys( classes );
    let used = [];

    /**
     * @function styler
     * usa delle classi in un componente
     */
    function styler( opts = {} ) {
      const using = _.keys( opts );

      // segna tutte le classi come usate
      // @todo warning se si cerca di usare una classe non definita
      used = _.union( used, using );

      // restituisce solo i nomi di classe per cui il valore nella mappa
      // è true
      return using
        .filter((className)=>{
          return opts[className]
        })
        .map((className)=>{
          // se la classe usata è definita da questo conteiner
          // la marca con dall'id del container
          // altrimenti restituisce il nome della classe pulito
          return _.contains( classNames, className )
            ? `__${containerID}-${className}`
            : className
        })
        .join(' ');
    }


    /**
     * @class Container
     * Style Wrapper Container
     */
    const Container = React.createClass({

      displayName : `Style(${Component.displayName})`,

      /**
       * @method componentDidMount
       * @static
       */
      componentDidMount() {
        const { document } = global;
        if ( document ) {
          document.getElementById( styleID ).innerHTML = Styler.toStyleSheet({ wrapped : false });
        };
      },

      render() {

        const { children, ...others } = this.props;
        const props = {
          ...others,
          styler
        };

        return <Component { ...props }>{children}</Component>
      }
    });

    Object.assign( Container, {

      /**
       * @method getStyle
       * @static
       */
      getStyle() {
        return {
          [`§${containerID}`] : Container
        }
      },

      /**
       * @method getRules
       * @static
       */
      getRules( rules = [] ) {

        for( const selector of used ) {
          serialize( `.__${containerID}-${selector}`,
            classes[selector], { rules } );
        }

        _.keys( fragments )
          .map((fragmentName)=>{
            return fragments[fragmentName]
          })
          .forEach((fragment)=>{
            fragment.getRules( rules );
          });

        return rules;
      },

      /**
       * @method toStyleSheet
       * @static
       */
      toStyleSheet() {

        const rules = this.getRules();
        return (
          `<style>${
            rules.map((rule) => `${rule.selector} { ${rule.descriptor} }`).join('\n')
          }</style>`
        )

      }
    });

    containers.push( Container );
    return Container;

  },

  /**
   * Produce lo stile di tutti i containers utilizzati da questa
   * istanza di styler
   * @method toStyleSheet
   * @static
   */
  toStyleSheet( opts = {} ) {

    const { wrapped } = {
      wrapped : true,
      ...opts
    };

    const rules = _.flatten(
      containers
        .map((container)=>container.getRules())
    );

    const css = rules
      .map((rule) => `${rule.selector} { ${rule.descriptor} }`)
      .join('\n');

    return (
      wrapped ? `<style>${css}</style>` : css
    );

  }

}



/**
 * @function serialize
 */
function serialize( selector, descriptor, ctx = {} ) {

  const {
    rules
  } = {
    rules : [],
    ...ctx
  };

  const rule = {
    selector,
    descriptor : ''
  };

  rules.push( rule );

  _.keys( descriptor ).map((prop)=>{

   // console.log( 'mapping', prop );

    const value = descriptor[prop];

    switch ( typeof value ) {

      case 'number' :
      case 'string' :
        rule.descriptor += `\n\t${_.kebabCase(prop)}: ${descriptor[prop]};`
        break;

      case 'object' :
        serialize( `${selector} ${prop}`, value, { rules } )
    }

  });



  return rule;

}
