$(document).ready(function(){

	let tagsData = CreateTags([], []);

	// add the tag to the tags array when the tag is added
	$('.tags').on('tagAdded', function(e, tag){
		tagsData.tags.push(tag);
	});

	// remove the tag from the tags array when the tag is removed
	$('.tags').on('tagRemoved', function(e, tag){		
		RemoveTag(tagsData.tags, tag);
	});
	
	addNewFile(false);
	
	function addNewFile(deleteable)
	{
		let html = $('#uploadFiles').append(
			`<div class="uploadImage">
				<div></div>
				<label class="uploadLabel">
					<input type="file" class="file" accept="image/* video/mp4">
					<p>Please select a Image or Video</p>
				</label>
				${deleteable?'<p class="remove">X</p>':''}
			</div`
		);
		
		$('.file').on('change', function(){
			const parent = $(this).parent();
			const self = $(this);
			const file = this.files[0];
			if(file){
				const reader = new FileReader();
				const name = file.name;

				reader.addEventListener('load', function(e){
					const url = this.result;
					const video = isVideo(name);
					self.siblings('img').remove();
					self.siblings('video').remove();
					if(video){
						parent.prepend('<video src="'+url+'" alt="Image Preview" class="imagePreview">');
					}else{
						parent.prepend('<img src="'+url+'" alt="Image Preview" class="imagePreview">');
					}
				});
				reader.readAsDataURL(file);
			}
			else{
				$(this).siblings('img').remove();
				$(this).siblings('video').remove();
			}
		});

		$('.remove').on('click', function(){
			$(this).parent().remove();
		});
	}

	$('#addNewFile').on('click', () => addNewFile(true));

	$('#upload').on('click', function(){

		//enctype="multipart/form-data"

		let formData = new FormData();

		const fileInputs = $('.file');
		for (let i = 0; i < fileInputs.length; i++){
			const file = fileInputs[i].files[0];
			console.log(file);
			if(file == null){
				$('#error').html("please select an image");
				//return;
			}
			formData.append("image", file);
		}

		$.ajax({
			type: 'POST',
			url: '/upload' + (tagsData.tags.length != 0 ? '?tags=["'+tagsData.tags.join('","')+'"]' : ''),
			data: formData,

			async: false,
			cache: false,
			contentType: false,
			processData: false,

			success: function(res){
				window.location.replace('/upload');
			}
		});

	});
});