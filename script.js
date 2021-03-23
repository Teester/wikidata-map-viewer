body {
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Lato, Helvetica, Arial, sans-serif;;
	padding: 0px;
	margin: 0px;
	height: 100%;
	display: flex;
}

html {
	height: 100%;
}

#mapid {
	height:100%;
	width: 100%;
	display: block;
	z-index: 1;
	transition: margin-left .5s;
}

#notify {
    position:fixed;
    bottom: 0px;
    width:100%;
    background-color:red;
    height:20px;
    color:white;
    display:none;
    text-align:center;
    padding:5px;
    line-height:1em;
    cursor:pointer;
    z-index: 2;
}

#crosshair {
	left: calc(50% - 10px);
    top: calc(50% - 10px); 
    position: absolute;
    width: 20px;
    height: 20px;
    z-index: 10000;
    text-align: center;
    font-weight: normal;
    font-size: 16px;
    color: #222;
    text-shadow: 1px 1px 3px #fff;
}

 /* The sidebar menu */
.sidebar {
  height: 100%; /* 100% Full-height */
  width: 0; /* 0 width - change this with JavaScript */
  position: fixed; /* Stay in place */
  z-index: 1; /* Stay on top */
  top: 0;
  left: 0;
  background-color: white; 
  overflow-x: hidden; /* Disable horizontal scroll */
  transition: 0.5s; /* 0.5 second transition effect to slide in the sidebar */
}

/* The button used to open the sidebar */
.openbtn {
	position: absolute;
	display: block;
	top: 80px;
	left: 10px;
	width: 34px;
	height: 34px;
	line-height: 34px;
	text-align: center;
	cursor: pointer;
	background-color: white;
	background-clip: padding-box;
	color: black;
	border: rgba(0, 0, 0, 0.2) 2px solid;
	z-index: 10000;
	border-radius:4px;
	font: normal 18px 'Lucida Console', Monaco, monospace;
	pointer-events: auto;
}

.searchbtn {
	position: absolute;
	display: block;
	top: 120px;
	left: 10px;
	width: 34px;
	height: 34px;
	line-height: 34px;
	text-align: center;
	cursor: pointer;
	background-color: white;
	background-clip: padding-box;
	color: black;
	border: rgba(0, 0, 0, 0.2) 2px solid;
	z-index: 10000;
	border-radius:4px;
	font: normal 16px 'Lucida Console', Monaco, monospace;
	pointer-events: auto;
}

/* On smaller screens, where height is less than 450px, change the style of the sidenav (less padding and a smaller font size) */
@media screen and (max-height: 450px) {
  .sidebar {padding-top: 15px;}
  .sidebar a {font-size: 18px;}
} 

table {
	padding: 5px; 
}

.table-qnumber {
	font-size: 10px;
}

.table-place {
	font-size: 14px;
}

.table-description {
	font-size: 10px;
}

.row:hover {
	background: #eee;
}

.input {
	position: absolute;
	top: 10px;
	left: 5px;
	width: 200px;
	padding: 5px;
}

#clear_button {
	position: absolute;
	top: 17px;
	left: 210px;
	color: #666;
	cursor:pointer;

}

.autocomplete-items {
  position: absolute;
  border: 1px solid #aaa;
  border-bottom: none;
  border-top: none;
  z-index: 99;
  /*position the autocomplete items to be the same width as the container:*/
  top: 42px;
  left: 5px;
  right: 0;
  width: 224px;
}
.autocomplete-items div {
  padding: 2px;
  cursor: pointer;
  background-color: #fff;
  border-bottom: 1px solid #aaa;
}
.autocomplete-items div:hover {
  /*when hovering an item:*/
  background-color:#eee;
}
.autocomplete-active {
  /*when navigating through the items using the arrow keys:*/
  background-color: #fff  !important;
  color: #eee;
}

.autocomplete-label {
	font-size: 14px;
	font-weight: bold;
}

.description {
	font-size: 10px;
}

#settingsContainer {
	padding: 10px;
	float: left;
	position: absolute;
	top:0px;
	left: 0px;
	
}

#details {
	position: absolute;
	top: 60px;
}
