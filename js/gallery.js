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

	console.log(data);

	// add images to galery
	var galleryhtml = '';
	var carouselhtml = '';
	if(data.files.length > 0){
		for(i = 0; i < data.files.length; i++){
			galleryhtml += `<span class="image">
							<img src="images/${data.userID}/${data.files[i].name}">
						</span>`;

			carouselhtml += `<li class="slide"><img src="images/${data.userID}/${data.files[i].name}"></li>`;
		}
	}

	$('#gallery').html(galleryhtml);
	$('.track').html(carouselhtml);

	// gallery controls
	var imageViewOpen = false;

	const imageViewOpenHash = "#image_view_open";
	const imageViewCloseHash = "#image_view_close";

	window.location.hash = imageViewCloseHash;

	function toggleImageView(val){
		const animationTime = 500;
		if(val != imageViewOpen){
			$('#gallery').slideToggle(animationTime);
			$('#imageView').slideToggle(animationTime);
		}
		imageViewOpen = val
	}

	$('.image').on('click', function(){
		window.location.hash = imageViewOpenHash;
		toggleImageView(true);
		activeImage = $('.image').index(this);
		updateImageView();
	});

	$(window).on('hashchange', function(){
		if(window.location.hash == imageViewCloseHash){
			toggleImageView(false);
		}
	});

	// carousel

	const slides = $('.track').children();

	var activeImage = 0;
	var imageCount = slides.length;

	updateImageView();

	function getWrapedIndex(index){
		if(index >= imageCount)
			index -= imageCount;
		if(index < 0)
			index += imageCount;
		return index;
	}

	function updateImageView(){
		const images = $('.track').children();
		images.hide();
		images.eq(activeImage).show();
		updateTags();
	}

	function moveImage(amount){
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

	// tag controles

	function updateTags()
	{
		const tags = data.files[activeImage].tags;

		var tagshtml = '';
		for(i = 0; i < tags.length; i++){
			tagshtml += `<div class="tag">
							<p class="tagName">${tags[i]}</p>
							<figure class="tag_btn remove_btn"><img src="public/minus.png"></figure>
						</div>`;
		}

		tagshtml += `<div class="tag">
						<form class="newTag"><input type="text"></input></form>
						<figure class="tag_btn add_btn"><img src="public/add.png"></figure>
					</div>`;
		

		$('.tags').html(tagshtml);

		$('.remove_btn').on({
			mouseenter: function () {
				$(this).parent().css({background: 'red', 'border-color': 'red'});
			},
			mouseleave: function () {
				$(this).parent().css({background: 'transparent', 'border-color': '#17a2b8'});
			}
		});
		
		$('.add_btn').on({
			mouseenter: function () {
				$(this).parent().css({background: '#32CD32', 'border-color': '#32CD32'});
			},
			mouseleave: function () {
				$(this).parent().css({background: 'transparent', 'border-color': '#17a2b8'});
			}
		});
	
		$('.tagName').on({
			mouseenter: function () {
				$(this).parent().css({background: '#17a2b8'});
			},
			mouseleave: function () {
				$(this).parent().css({background: 'transparent'});
			}
		});
	
		$('.remove_btn').on('click', function(){
			const tag = $(this).siblings('.tagName').html();
			const filename = data.files[activeImage].name;
			const url = '/removeTag?tag='+tag+'&filename='+filename;

			// send delete request to remove tag
			$.ajax({
				type: 'DELETE',
				url: url
			});
			
			// remove the tag form view
			const index = data.files[activeImage].tags.indexOf(tag);
			data.files[activeImage].tags.splice(index, 1);
			updateTags()
		});
	
		var inputShowing = false;

		function addTag(){
			if(!inputShowing){
				// show the input box for the new tag
				$('.newTag').show().animate({width: '100px'}, 500);
				inputShowing = true;
			}
			else{
				const tag = $('.newTag').children('input[type="text"]').val();
				if(tag.replace(/\s/g, '') != '')
				{
					const filename = data.files[activeImage].name;

					if(tag == 'all' || !data.files[activeImage].tags.find(e => e == tag)){

						const url = '/addTag?tag='+tag+'&filename='+filename;

						// make put request to add tag
						$.ajax({
							type: 'PUT',
							url: url
						});

						// add tag to view
						data.files[activeImage].tags.push(tag);
					}
					// update window
					updateTags();
				}
				else
				{
					$('.newTag').show().animate({width: '0px'}, 500);
					inputShowing = false;
				}
			}
			return false;
		}

		$('.add_btn').on('click', addTag);
		$('.newTag').submit(addTag);
	
		$('.tagName').on('click', function(){
			// search for tag
			const search =  $(this).html();
			window.location.replace('/gallery?search='+search);
		});
	}

	$('#delete').on('click', function(){
		if(confirm("do you want to delete this image?"))
		{
			// remove image form database
			const filename = data.files[activeImage].name;
			const url = '/removeImage?filename='+filename;

			$.ajax({
				type: 'DELETE',
				url: url
			});

			// remove image from data
			const index = data.files.indexOf(filename);
			data.files.splice(index, 1);

			// remove image from carousel
			$('.track').children().eq(activeImage).remove();
			imageCount--;
			updateImageView();

			// remove image from gallery
			$('#gallery').children().eq(activeImage).remove();
		}
	});

});