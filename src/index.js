var templateMessage = require('../message.hbs'),
    templateComment = require('../comments.hbs'),
    normalize = require('./style/normalize.css'),
    fontStyle = require('./style/fonts.css'),
    style = require('./style/main.css');

class geoComment {
    constructor() {
        this.mapContainer = document.getElementById('map');
        this.map = null;
        this.markerCluster = null;
        this.markerCoords;
        this.markers = [];
        this.isMessageOpen = false;
    }

    initMap() {
        return new Promise((resolve, reject) => {
            window.addEventListener('load', () => {
                this.map = new google.maps.Map(this.mapContainer, {
                    center: {
                        lat: 55.754336,
                        lng: 37.620640
                    },
                    zoom: 14
                });

                this.markerCluster = new MarkerClusterer(this.map, this.markers,
                    { 
                        imagePath: '../src/img/m'
                    });

                resolve();
            });
        })
    }

    addMarker(markerPosition) {
        let image = {
            url: '../src/img/marker.png',
            scaledSize: new google.maps.Size(26, 39)
        };
        let marker = new google.maps.Marker({
            animation: 'DROP',
            position: markerPosition,
            map: this.map,
            icon: image
        })
        this.markers.push(marker);

        this.markerCluster.addMarker(marker);
    }

    addMapListeners() {
        let coords = {
                mouse: {}
            },
            geocoder = new google.maps.Geocoder(),
            context = {},
            button,
            timerId;

        document.body.addEventListener('mousedown', (e) => {
            coords.mouse.pageX = e.pageX;
            coords.mouse.pageY = e.pageY;
            button = e.button;
        });

        document.body.addEventListener('mouseup', (e) => {
            clearTimeout(timerId);
        });

        this.map.addListener('click', (e) => {
            function getCoords(e) {
                if (this.isMessageOpen === false && button === 0) {
                    geocoder.geocode({ location: e.latLng }, (results, status) => {
                        if (status === 'OK') {
                            context.title = {
                                address: results[0].formatted_address
                            };
                        } else {
                            context.title = {
                                address: 'Адрес не найден'
                            };
                        }
                        this.markerCoords = e.latLng;
                        this.render(context, coords);
                        this.isMessageOpen = true;
                    })
                }
            }
            timerId = setTimeout(getCoords.bind(this, e), 50); 
        })
    }

    addMessageListeners() {
        function closeMessage(e) {
            if (e.target.classList.contains('message__close')) {
                e.target.closest('.message').remove();
                this.isMessageOpen = false;
                e.stopPropagation();
            }
        }

        function addComment(e) {
            // alert
            if (e.target.classList.contains('message__button')) {
                let form = document.getElementById('form'),
                    list = document.getElementById('messageList'),
                    temp = document.getElementById('messageTemp'),
                    context = {},
                    commentHtml,
                    li;

                if (form.name.value === '' ||
                    form.place.value === '' ||
                    form.content.value === '') {
                    if (!document.getElementById('alert')) {
                        let alert = document.createElement('div');
                                                    
                        alert.classList.add('message__alert');
                        alert.setAttribute('id', 'alert');
                        alert.innerHTML = 'Необходимо заполнить все поля';
                        document.getElementById('message').appendChild(alert);
                    }
                    
                    return;
                }

                if (document.getElementById('alert')) {
                    document.getElementById('alert').remove();
                }

                // make a comment

                context.userName = form.name.value;
                context.place = form.place.value;
                context.content = form.content.value;

                commentHtml = templateComment(context);
                li = document.createElement('li');
                li.classList.add('comment');
                li.innerHTML = commentHtml;
                
                // remove the temp 
                if (temp) {
                    temp.remove();
                }

                // append a comment
                list.appendChild(li);

                // add marker

                this.addMarker(this.markerCoords);
            }
        }

        document.body.addEventListener('click', closeMessage.bind(this));
        document.body.addEventListener('click', addComment.bind(this));
    }

    render(context, coords) {
        let container = document.createElement('div'),
            containerStyle;
            
        // make the message
        container.classList.add('message');
        container.setAttribute('id', 'message');
        container.innerHTML = templateMessage(context.title);
        document.body.appendChild(container);
        containerStyle = getComputedStyle(container);
        // positioning of the message
        container.style.left = coords.mouse.pageX + 'px';
        container.style.top = coords.mouse.pageY + 'px';

        if (coords.mouse.pageY + parseInt(containerStyle.height, 10) > document.documentElement.clientHeight) {
            container.style.top = document.documentElement.clientHeight - parseInt(containerStyle.height, 10) + 'px';
        }
        if (coords.mouse.pageX + parseInt(containerStyle.width, 10) > document.documentElement.clientWidth) {
            container.style.left = document.documentElement.clientWidth - parseInt(containerStyle.width, 10) + 'px';
        }
    }
}

let geo = new geoComment();

geo.initMap()
        .then(() => {
            geo.addMapListeners();
            geo.addMessageListeners();
        })