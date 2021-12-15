$(document).ready(async function(){
	// get all images
	params = new URLSearchParams(window.location.search);

	data = {};

	// get a list of all the uuids for the images
	await $.ajax({
		type: 'GET',
		url: '/files?expression='+params.get('search'),
		success: function(res){
			data = res;
		}
	});

	// get the images file name and extention
	async function GetImageName(imageID){
		if(imageID == null)
			return null;

		let info = {};
		await $.ajax({
			type: 'GET',
			url: '/imageName?imageID='+imageID,
			success: function(res){
				info = res.name;
			}
		});
		return info;
	}

	// get the list of tags for an image
	async function GetImageTags(imageID){
		if(imageID == null)
			return null;

		let info = {};
		await $.ajax({
			type: 'GET',
			url: '/imageTagNames?imageID='+imageID,
			success: function(res){
				info = res.tags;
			}
		});
		return info;
	}

	// gallery controls
	var imageViewOpen = false;

	const imageViewOpenHash = "#image_view_open";
	const imageViewCloseHash = "#image_view_close";

	window.location.hash = imageViewCloseHash;

	slides = [];
	activeImage = 0;
	imageCount = 0;
	activeTags = CreateTags([], ["all"]);

	function toggleImageView(val){
		const animationTime = 500;
		if(val != imageViewOpen){
			$('#gallery').slideToggle(animationTime);
			$('#imageView').slideToggle(animationTime);
		}
		imageViewOpen = val
	}

	// generate the gallery html for the new images
	async function GenGalleryPageHtml(images)
	{
		var galleryhtml = "";
		if(images.length > 0){
			for(i = 0; i < images.length; i++){
				let name = await GetImageName(images[i]);
				let video = isVideo(name);

				galleryhtml += `<span class="image">`
				if(video)
					galleryhtml += `<video class="media" src="images/${data.userID}/${name}">`;
				else
					galleryhtml += 	`<img class="media" src="images/${data.userID}/${name}">`;
				galleryhtml += `</span>`;
			}
		}
		return galleryhtml;
	}

	// generate the track html for the new images
	async function GenTrackPageHtml(images){
		var carouselhtml = $('.track').html();
		if(images.length > 0){
			for(i = 0; i < images.length; i++){
				let name = await GetImageName(images[i]);
				let video = isVideo(name);

				carouselhtml += `<li class="slide">`;
				if(video)
					carouselhtml += `<video src="images/${data.userID}/${name}" controls>`;
				else
					carouselhtml += `<img src="images/${data.userID}/${name}">`;
				carouselhtml += `</li>`;
			}
		}
		return carouselhtml;
	}

	const imagesPerRow = 4;
	rowsPerPag = Math.ceil(window.innerHeight/(0.16*window.innerWidth));
	const imagesPerPage = rowsPerPag*imagesPerRow;
	const numPages = Math.ceil(data.files.length / imagesPerPage);
	loadedPages = 0;

	$(window).resize(function(){
		rowsPerPag = Math.ceil(window.innerHeight/(0.16*window.innerWidth));
	});

	async function LoadNextPage()
	{
		// check if there are more pages to load
		if(loadedPages >= numPages)
			return;

		// get all the images for this page
		const images = data.files.slice(imagesPerPage*loadedPages, imagesPerPage*(loadedPages+1));

		// add the html for the images
		$('#gallery').append(await GenGalleryPageHtml(images));

		// update the on click function for all the added images
		$('.image').on('click', function(){
			window.location.hash = imageViewOpenHash;
			activeImage = $('.image').index(this);
			toggleImageView(true);
			updateImageView();
		});

		slides = $('.track').children();
		imageCount = slides.length;

		loadedPages++;
	}
	
	await LoadNextPage();

	const options = {
		rootMargin: "10px"
	};

	const nextobserver = new IntersectionObserver(async function(entries, o)
	{
		await LoadNextPage();
	}, options);

	nextobserver.observe($('#observer')[0]);

	$(window).on('hashchange', function(){
		if(window.location.hash != imageViewOpenHash){
			toggleImageView(false);
		}
	});

	// carousel

	updateImageView();

	function getWrapedIndex(index){
		if(index >= imageCount)
			index = imageCount-1;
		if(index < 0)
			index = 0;
		return index;
	}

	async function updateImageView(){

		if(data.files.length == 0){
			window.history.back();
			return;
		}

		activeTags.tags = await GetImageTags(data.files[activeImage]);

		const images = $('.track').children();
		images.hide();
		images.eq(activeImage).show();
		activeTags.updateTags(activeTags.tags);
	}

	function moveImage(amount){
		
		activeSlide = $(slides[activeImage]).children()[0];
		if(activeSlide.nodeName == "VIDEO")
		{
			activeSlide.pause();
		}

		activeImage += amount;
		activeImage = getWrapedIndex(activeImage);

		updateImageView();
	};

	$('.btn-left').on('click', function(){
		moveImage(-1);
	});

	$('.btn-right').on('click', function(){
		moveImage(1);
	});
	
	var hovering = false;
	$('#container').hover(function(){
		hovering = true;
	}, function(){
		hovering = false;
	});
	
	$('body').keydown(function(event){
		if(imageViewOpen && hovering){
			if(event.which == 39){
				moveImage(1);
			}
			else if(event.which == 37){
				moveImage(-1);
			}
		}
	});

	$('.tags').on('tagAdded', function(e, tag){
		const url = '/addTag?tag='+tag+'&imageID='+data.files[activeImage];

		// make put request to add tag
		$.ajax({
			type: 'PUT',
			url: url
		});

		// add tag to view
		activeTags.tags.push(tag);
	});

	$('.tags').on('tagRemoved', function(e, tag){
		const url = '/removeTag?tag='+tag+'&imageID='+data.files[activeImage];

		// send delete request to remove tag
		$.ajax({
			type: 'DELETE',
			url: url
		});
		
		// remove the tag form view
		RemoveTag(activeTags.tags, tag);
	});

	$('.tags').on('tagClicked', function(e, tag){
		window.location.replace('/gallery?search='+tag);
	});

	$('#delete').on('click', function(){
		if(confirm("do you want to delete this image?"))
		{
			// remove image form database
			const url = '/removeImage?imageID='+data.files[activeImage];

			console.log("removing image");

			$.ajax({
				type: 'DELETE',
				url: url
			});

			// remove image from data
			data.files.splice(activeImage, 1);

			// remove image from carousel
			$('.track').children().eq(activeImage).remove();
			imageCount--;
			updateImageView();

			// remove image from gallery
			$('#gallery').children().eq(activeImage).remove();

			moveImage(0);
		}
	});
});