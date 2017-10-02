var templateMessage = require('../message.hbs'),
    templateComment = require('../comments.hbs'),
    templateCarousel = require('../carousel.hbs'),
    templateCarouselWrap = require('../carouselWrap.hbs'),
    normalize = require('./style/normalize.css'),
    fontStyle = require('./style/fonts.css'),
    style = require('./style/main.css');

class geoComment {
    constructor() {
        this.mapContainer = document.getElementById('map');
        this.map = null;
        this.markerCluster = null;
        this.markerCoords;
        this.markerAddress;
        this.markers = [];
        this.isMessageOpen = false;
        this.position = {
            mouse: {}
        }; 
    }

    initMap() {
        new Promise((resolve, reject) => {
            window.addEventListener('load', () => {
                this.map = new google.maps.Map(this.mapContainer, {
                    center: {
                        lat: 55.754336,
                        lng: 37.620640
                    },
                    zoom: 14,
                    styles: [
                        {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
                        {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
                        {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
                        {
                            featureType: 'administrative.locality',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#d59563'}]
                        },
                        {
                            featureType: 'poi',
                            elementType: 'labels.text.fill',
                            stylers: [{"visibility": "off"}]
                        },
                        {
                            featureType: 'poi.park',
                            elementType: 'geometry',
                            stylers: [{color: '#263c3f'}]
                        },
                        {
                            featureType: 'poi.park',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#6b9a76'}]
                        },
                        {
                            featureType: 'road',
                            elementType: 'geometry',
                            stylers: [{color: '#878080'}]
                        },
                        {
                            featureType: 'road',
                            elementType: 'geometry.stroke',
                            stylers: [{color: '#878080'}]
                        },
                        {
                            featureType: 'road',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#878080'}]
                        },
                        {
                            featureType: 'road.highway',
                            elementType: 'geometry',
                            stylers: [{color: '#c7baba'}]
                        },
                        {
                            featureType: 'road.highway',
                            elementType: 'geometry.stroke',
                            stylers: [{color: '#c7baba'}]
                        },
                        {
                            featureType: 'road.highway',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#f3d19c'}]
                        },
                        {
                            featureType: 'transit',
                            elementType: 'geometry',
                            stylers: [{color: '#2f3948'}]
                        },
                        {
                            featureType: 'transit.station',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#d59563'}]
                        },
                        {
                            featureType: 'water',
                            elementType: 'geometry',
                            stylers: [{color: '#17263c'}]
                        },
                        {
                            featureType: 'water',
                            elementType: 'labels.text.fill',
                            stylers: [{color: '#515c6d'}]
                        },
                        {
                            featureType: 'water',
                            elementType: 'labels.text.stroke',
                            stylers: [{color: '#17263c'}]
                        }
                    ]
                });

                this.markerCluster = new MarkerClusterer(this.map, this.markers,
                    {
                        zoomOnClick: false,
                        imagePath: '../src/img/Layer',
                    });

                resolve();
            });
        })
        .then(() => {
            this.addMapListeners();
            this.localStorageHandler();
            this.addMessageListeners();
            this.addClusterListeners();
            this.saveMapInit();
            this.dndInit();
        })
    }

    saveMapInit() {
        let saveButton = document.getElementById('button_save'),
            delButton = document.getElementById('button_del');

        saveButton.addEventListener('click', () => {
            let localMarkers = [],
                localMap = {
                    center: this.map.getCenter(),
                    zoom: this.map.getZoom()
                };
            
            for (let i = 0; i < this.markers.length; i++) {
                let mark = {
                    position: this.markers[i].position,
                    comment: this.markers[i].comment,
                    address: this.markers[i].address
                }
    
                localMarkers.push(mark);
            }
    
            localStorage.markers = JSON.stringify(localMarkers);
            localStorage.map = JSON.stringify(localMap);
        })

        delButton.addEventListener('click', () => {
            localStorage.clear();
            document.location.reload();
        })
    }

    localStorageHandler() {
        if (localStorage.markers !== undefined) {
            let localMarkers = JSON.parse(localStorage.markers),
                localMap = JSON.parse(localStorage.map);

            for (let i = 0; i < localMarkers.length; i++) {
                this.appendMarker(localMarkers[i].position, localMarkers[i].comment, localMarkers[i].address)
            }
            this.map.setCenter(localMap.center);
            this.map.setZoom(localMap.zoom);
        } else {
            return
        }
    }

    appendMarker(markerPosition, comment, address) {
        let image = {
                url: '../src/img/marker.png',
                scaledSize: new google.maps.Size(31, 39)
            },
            marker = new google.maps.Marker({
                position: markerPosition,
                map: this.map,
                icon: image
            });

        marker.comment = comment;
        marker.address = address;
        this.markers.push(marker);

        this.markerCluster.addMarker(marker);

        marker.addListener('click', () => {
            if (this.isMessageOpen === false) {
                this.render({ title: { address: marker.address } }, this.position);
                this.appendComment(marker.comment);
                this.markerCoords = markerPosition;
                this.markerAddress = address;
                this.isMessageOpen = true;
            }
        })
    }

    appendComment(context) {
        let list = document.getElementById('messageList'),
            temp = document.getElementById('messageTemp'),
            commentHtml,
            li;

        // remove the temp 
        if (temp) {
            temp.remove();
        }

        commentHtml = templateComment(context);
        li = document.createElement('li');
        li.classList.add('comment');
        li.innerHTML = commentHtml;

        list.appendChild(li);
    }

    addMapListeners() {
        let 
            geocoder = new google.maps.Geocoder(),
            context = {},
            button,
            timerId;

        document.body.addEventListener('mousedown', (e) => {
            this.position.mouse.pageX = e.pageX;
            this.position.mouse.pageY = e.pageY;
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
                            this.markerAddress = results[0].formatted_address;
                        } else {
                            context.title = {
                                address: 'Адрес не найден'
                            };
                        }
                        this.markerCoords = e.latLng;
                        this.render(context, this.position);
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

        function getDate() {
            let dateAndTime = new Date().toLocaleString('ru'),
                dateAndTimeArr = dateAndTime.split(',');

            dateAndTimeArr[0] = dateAndTimeArr[0].split('.');
            dateAndTimeArr[0].push(dateAndTimeArr[0].splice(1, 1));
            dateAndTimeArr[0].push(dateAndTimeArr[0].splice(0, 1));
            dateAndTimeArr[0] = dateAndTimeArr[0].join('.');

            return dateAndTimeArr.join('');
        }

        function addComment(e) {
            // alert
            if (e.target.classList.contains('button_message')) {
                let form = document.getElementById('form'),
                    context = {
                    };
                    
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
                context.date = getDate();

                // append a comment
                this.appendComment(context);

                // add marker

                this.appendMarker(this.markerCoords, context, this.markerAddress);
            }
        }

        document.body.addEventListener('click', closeMessage.bind(this));
        document.body.addEventListener('click', addComment.bind(this));
    }

    addClusterListeners() {
        let currentIndex = 1,
            markers = null;

        function renderComment(array, index) {
            let context = {
                    title: null,
                    address: null,
                    content: null
                },
                html;
            context.title = array[index-1].comment.place;
            context.address = array[index-1].address;
            context.content = array[index-1].comment.content;

            html = templateCarouselWrap(context);

            document.querySelector('.carousel__wrap').innerHTML = html;
        }

        // cluster
        google.maps.event.addListener(this.markerCluster, 'click', (c) => {
            if (this.isMessageOpen === false) {
                let carousel,
                    html,
                    context = {
                        pages: []
                    },
                    style,
                    styleLeft,
                    styleTop;

                markers = c.getMarkers();

                // get the context for template

                for (let i = 0; i < markers.length; i++) {
                    context.pages.push({
                        page: i + 1
                    });
                }
                html = templateCarousel(context);

                // make Carousel
                carousel = document.createElement('div');
                carousel.classList.add('carousel');
                carousel.classList.add('after');
                carousel.innerHTML = html;
                carousel.querySelector('.carousel__page').classList.add('carousel__page_active');

                document.body.appendChild(carousel);

                // get a position of insertion point
                style = getComputedStyle(carousel);
                styleLeft = this.position.mouse.pageX - parseInt(style.width, 10)/2;
                styleTop = this.position.mouse.pageY - parseInt(style.height, 10) - 10;

                if (styleLeft < 0) {
                    styleLeft = 0;
                    carousel.classList.remove('after');
                }
                if (styleTop < 0) {
                    styleTop = 0;
                    carousel.classList.remove('after');
                }
                if (styleLeft > document.documentElement.clientWidth - parseInt(style.width, 10)) {
                    styleLeft = document.documentElement.clientWidth - parseInt(style.width, 10);
                    carousel.classList.remove('after');
                }
                if (styleTop > document.documentElement.clientHeight - parseInt(style.height, 10)) {
                    styleTop = document.documentElement.clientHeight - parseInt(style.height, 10);
                    carousel.classList.remove('after');
                }

                carousel.style.left = styleLeft + 'px';
                carousel.style.top = styleTop + 'px';

                renderComment(markers, 1);
                this.isMessageOpen = true;
            }
        })

        // navigation
        document.body.addEventListener('click', (e) => {
            let newIndex;

            // pagination
            if (e.target.classList.contains('carousel__page') &&
                !e.target.classList.contains('carousel__page_active')) {
                e.preventDefault();
                newIndex = parseInt(e.target.textContent, 10);
            } else
            // left button
            if (e.target.classList.contains('carousel__left')) {
                newIndex = currentIndex - 1;
                if (newIndex === 0) {
                    return;
                }
            } else 
            // right button
            if (e.target.classList.contains('carousel__right')) {
                newIndex = currentIndex + 1;
                if (newIndex > markers.length) {
                    return;
                }
            } else {
                return
            }
            renderComment(markers, newIndex);
            document.querySelectorAll('.carousel__page')[currentIndex-1].classList.remove('carousel__page_active');
            document.querySelectorAll('.carousel__page')[newIndex-1].classList.add('carousel__page_active');
            currentIndex = newIndex;
        })

        // close button

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('carousel__close')) {
                e.target.closest('.carousel').remove();
                this.isMessageOpen = false;
            }
        })

        // address link

        document.body.addEventListener('click', (e) => {
            let marker;

            if (e.target.classList.contains('carousel__address')) {
                e.preventDefault();
                marker = markers[currentIndex - 1];
                // close carousel
                e.target.closest('.carousel').remove();
                this.isMessageOpen = false;
                // open comments
                this.render({ title: { address: marker.address } }, this.position);
                for (let i = 0; i < markers.length; i++) {
                    if (markers[i].address === marker.address) {
                        this.appendComment(markers[i].comment);
                    }
                }

                currentIndex = 1;
            }
        })
    }

    dndInit() {
        let element,
            coords,
            shiftX,
            shiftY;

        function move(event) {
            event.preventDefault();
            let elementStyle = getComputedStyle(element),
                elementHeight = parseInt(elementStyle.height, 10),
                elementWidth = parseInt(elementStyle.width, 10);

            element.style.left = event.pageX - shiftX + 'px';
            element.style.top = event.pageY - shiftY + 'px';

            if (event.pageX - shiftX < 0) {
                element.style.left = 0 + 'px';
            }
            if (event.pageY - shiftY < 0) {
                element.style.top = 0 + 'px';
            }

            if (event.pageX - shiftX > document.documentElement.clientWidth - elementWidth) {
                element.style.left = document.documentElement.clientWidth - elementWidth + 'px';
            }
            if (event.pageY - shiftY > document.documentElement.clientHeight - elementHeight) {
                element.style.top = document.documentElement.clientHeight - elementHeight + 'px';
            }
        }

        document.body.addEventListener('mousedown', (e) => {
            if (e.target.closest('.message__title') || e.target.closest('.carousel')) {
                e.preventDefault();
                if (e.target.classList.contains('message__title')) {
                    element = document.getElementById('message');
                } else if (e.target.closest('.carousel__main')) {
                    if (e.target.classList.contains('carousel__address')) {
                        return
                    }
                    element = document.querySelector('.carousel');
                } else {
                    return
                }

                coords = element.getBoundingClientRect();
                shiftX = event.pageX - coords.left;
                shiftY = event.pageY - coords.top;
                
                document.body.addEventListener('mousemove', move);
                document.body.addEventListener('mouseup', () => {
                    document.body.removeEventListener('mousemove', move);
                })
            }
        }) 
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

geo.initMap();