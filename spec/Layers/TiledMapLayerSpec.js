/* eslint-env mocha */
/* eslint-disable handle-callback-err */
describe('L.esri.TiledMapLayer', function () {
  function createMap () {
    // create container
    var container = document.createElement('div');

    // give container a width/height
    container.setAttribute('style', 'width:500px; height: 500px;');

    // add contianer to body
    document.body.appendChild(container);

    return L.map(container).setView([37.75, -122.45], 12);
  }

  var url = 'http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer';
  var urlWithParams = 'http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer?foo=bar';
  var subdomainsUrl = 'http://{s}.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer';
  var subdomainsArray = ['server', 'services'];
  var layer;
  var map;

  beforeEach(function () {
    fetchMock.config.overwriteRoutes = true;
    fetchMock.config.fallbackToNetwork = true;
    layer = L.esri.tiledMapLayer({
      url: url
    });
    map = createMap();
  });

  afterEach(function () {
    fetchMock.restore();
  });

  it('will assign a tile scheme to the url', function () {
    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}');
  });

  it('will modify url for old tiles.arcgisonline.com services', function () {
    var layer = L.esri.tiledMapLayer({
      url: 'http://tiles.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer'
    });
    expect(layer.tileUrl).to.equal('http://tiles{s}.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}');
    expect(layer.options.subdomains).to.deep.equal(['1', '2', '3', '4']);
  });

  it('will modify url for new tiles.arcgis.com services', function () {
    var layer = L.esri.tiledMapLayer({
      url: 'http://tiles.arcgis.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer'
    });
    expect(layer.tileUrl).to.equal('http://tiles{s}.arcgis.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}');
    expect(layer.options.subdomains).to.deep.equal(['1', '2', '3', '4']);
  });

  it('will modify url for service with subdomains', function () {
    var layer = L.esri.tiledMapLayer({
      url: subdomainsUrl,
      subdomains: subdomainsArray
    });

    expect(layer.options.url).to.equal('http://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/');
  });

  it('should expose the authenticate method on the underlying service', function () {
    var spy = sinon.spy(layer.service, 'authenticate');
    layer.authenticate('foo');
    expect(spy).to.have.been.calledWith('foo');
  });

  it('should expose the query method on the underlying service', function () {
    // var spy = sinon.spy(layer.service, 'identify');
    var identify = layer.identify();
    expect(identify).to.be.an.instanceof(L.esri.IdentifyFeatures);
    expect(identify._service).to.equal(layer.service);
  });

  it('should propagate events from the service', function (done) {
    fetchMock.get(
      'http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/?f=json',
      JSON.stringify({
        copyrightText: 'foo',
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857
        }
      })
    );

    var requeststartSpy = sinon.spy();
    var requestendSpy = sinon.spy();

    layer.on('requeststart', requeststartSpy);
    layer.on('requestend', requestendSpy);

    layer.metadata(function () {
      expect(requeststartSpy.callCount).to.be.above(0);
      done();
    });

    // Don't khow how to handle that one as the event requestend is triggered after the metadata callback
    expect(requestendSpy.callCount).to.be.above(0);
  });

  it('should have a L.esri.tiledMapLayer alias', function () {
    layer = L.esri.tiledMapLayer({
      url: url
    });
    expect(layer).to.be.instanceof(L.esri.TiledMapLayer);
  });

  it('should use a token passed in options', function () {
    layer = L.esri.tiledMapLayer({
      url: url,
      token: 'foo'
    });

    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}?token=foo');
  });

  it('should store additional params passed in url', function () {
    layer = L.esri.tiledMapLayer({
      url: urlWithParams
    });

    expect(layer.options.requestParams).to.deep.equal({ foo: 'bar' });
    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}?foo=bar');
  });

  it('should use additional params passed in options', function () {
    layer = L.esri.tiledMapLayer({
      url: url,
      requestParams: {
        foo: 'bar'
      }
    });

    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}?foo=bar');
  });

  it('should use a token passed with authenticate()', function () {
    layer = L.esri.tiledMapLayer({
      url: url
    });

    layer.authenticate('foo');

    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}?token=foo');
  });

  it('should reauthenticate with a token authenticate()', function () {
    layer = L.esri.tiledMapLayer({
      url: url,
      token: 'foo'
    });

    layer.authenticate('bar');

    expect(layer.tileUrl).to.equal('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}?token=bar');
  });

  it('should display an attribution if one was passed', function () {
    L.esri.tiledMapLayer({
      url: url,
      attribution: 'Esri'
    }).addTo(map);

    expect(map.attributionControl._container.innerHTML).to.contain('Esri');
  });

  it('should display a metadata attribution if one is present and no attribution option was passed', function (done) {
    fetchMock.get(
      'http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/?f=json',
      JSON.stringify({
        copyrightText: 'foo',
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857
        },
        tileInfo: {
          lods: [{
            level: 0,
            resolution: 156543.03392800014,
            scale: 5.91657527591555E8
          }]
        }
      })
    );
    layer = L.esri.tiledMapLayer({
      url: url
    });
    layer.on('lodmap', function () {
      expect(map.attributionControl._container.innerHTML).to.contain('foo');
      done();
    });
    layer.addTo(map);
  });
});
/* eslint-enable handle-callback-err */
