

const states = [
  {
    url: '/spasm/index.html',
    template: '/spasm/templates/template1.html',
    meta : {
      title : "Index",
      canonical : "canonical test",
      hreflang : {
        xDefault : "x-default test",
        enUs : "en-us test",
      },
      index: false,
      follow: false,
    }
  },
  {
    url: '/state1',
    template: '/spasm/templates/template1.html',
    meta: {
      title:"State 1",
      index: true,
      follow: false
    }
  },
  {
    url: '/state2',
    template: '/spasm/templates/template2.html',
    meta: {
      title: "State 2",
      index: false,
      follow: true,
      hreflang : {
        enUs : "en-us test",
      }
    }
  },
  {
    url:'/state3',
    template:'/spasm/templates/template3.html',
    meta: {
      title: "State 3",
      index: true,
      follow: true
    }
  },
  {
    url:'**',
    template:'/spasm/templates/template3.html',
    meta: {
      title: "404 Not Found",
    }
  }
];


(function(s){
  console.log("Starting app");

  // Register our various controllers
  // These don't need to be related specifically to a state, rather
  // a single state can have multiple controllers
  s.controller('template1-controller',new Controller((elm) => {
    console.log('Tempalte 1 is under control!');

    // Setup data binding, yea its not as pretty as most spa frameworks,
    // but hey, this is spasm!  In general it should work similarly, if
    // much less robustly then the frameworks.  Syntax is the generally
    // used "handlebars"/"mustache" syntax like {{ this }}.
    let dataBinding = new DataBinding(elm, 'test');
    dataBinding.bind('/spasm/test.json');
  }));

  s.controller('template2-controller', new Controller((elm) => {
    console.log('Template 2 is under control!')
  }));

  s.controller('template2-2-controller', new Controller((elm) => {
    console.log('Template 2 is even more under control!')
  }));

  s.controller('template3-controller', new Controller((elm) => {
    console.log('Template 3 is under control!');
  }));

  // And finally, init our state machine!
  s.init("spasm", states);
})(window.spasm);