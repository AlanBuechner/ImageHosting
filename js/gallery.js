$(document).ready(async function(){
	// get all images
	params = new URLSearchParams(window.location.search);

	data = {};

	await $.ajax({
		type: 'GET',
		url: '/files?expression='+params.get('search'),
		success: function(res){
			data = res;
		}
	});

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

	console.log(data);

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

	function UpdateImageEvents()
	{
		$('.image').on('click', function(){
			window.location.hash = imageViewOpenHash;
			activeImage = $('.image').index(this);
			toggleImageView(true);
			updateImageView();
		});

		slides = $('.track').children();
		imageCount = slides.length;
	}

	async function AppendImagesBack(images){
		// add images to galery
		console.log("loading images: ");
		console.log(images);
		var galleryhtml = await GenGalleryPageHtml(images) + $('#gallery').html();

		$('#gallery').html(galleryhtml);

		UpdateImageEvents();
	}


	async function AppendImagesFront(images){
		// add images to galery
		console.log("loading images: ");
		console.log(images);
		var galleryhtml = $('#gallery').html() + await GenGalleryPageHtml(images);

		$('#gallery').html(galleryhtml);

		UpdateImageEvents();
	}

	const imagesPerRow = 4;
	const rowsPerPag = 3;
	const imagesPerPage = rowsPerPag*imagesPerRow;
	const pageHeight = rowsPerPag * 16;
	const numPages = Math.ceil(data.files.length / imagesPerPage);
	currentPage = 0;

	topPadding = 0;
	bottomPadding = 0;

	async function LoadPage(pageToLoad)
	{
		if(pageToLoad < 0 || pageToLoad >= numPages)
			return;
		console.log("loading page: " + (pageToLoad));


		function GetPage(page){
			return data.files.slice(imagesPerPage*page, imagesPerPage*(page+1));
		}

		if(pageToLoad < currentPage)
		{
			const images = GetPage(pageToLoad);
			await AppendImagesBack(images);

			topPadding -= pageHeight;
		}
		else if(pageToLoad >= currentPage)
		{
			const images = GetPage(pageToLoad);
			await AppendImagesFront(images);

			bottomPadding -= pageHeight;
		}

		if(topPadding < 0) topPadding = 0;
		if(bottomPadding < 0) bottomPadding = 0;

		$('#TopPadding').css({"height": topPadding + "vw"});
		$('#BottomPadding').css({"height": bottomPadding + "vw"});
	}

	async function UnloadPage(page)
	{
		if(page < 0 || page >= numPages)
			return;
		console.log("unloading page: " + (page));
		let gc = $('#gallery').children();
		let tc = $('.track').children();

		if(page < currentPage)
		{
			gc.slice(0, imagesPerPage).remove();
			tc.slice(0, imagesPerPage).remove();
			
			topPadding += pageHeight;
		}
		else if(page > currentPage)
		{
			gc.slice(imagesPerPage*2, gc.length).remove();
			tc.slice(imagesPerPage*2, gc.length).remove();

			bottomPadding += pageHeight;
		}
		
		$('#TopPadding').css({"height": topPadding + "vw"});
		$('#BottomPadding').css({"height": bottomPadding + "vw"});
		
	}

	NextPage = async function()
	{
		if(currentPage == numPages-1)
			return;

		await UnloadPage(currentPage-1);
		currentPage++;
		await LoadPage(currentPage+1);
	}

	LastPage = async function()
	{
		if(currentPage == 0)
			return;

		await UnloadPage(currentPage+1);
		currentPage--;
		await LoadPage(currentPage-1);
	}
	
	await LoadPage(0);
	await LoadPage(1);

	const options = {
		rootMargin: "10px"
	};

	const nextobserver = new IntersectionObserver(async function(entries, o)
	{
		NextPage();
	}, options);

	const lastobserver = new IntersectionObserver(async function(entries, o)
	{
		LastPage();
	}, options);

	//lastobserver.observe($('#TopPadding')[0]);
	nextobserver.observe($('#BottomPadding')[0]);

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