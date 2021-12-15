$(document).ready(function(){

	var data = {images:[]};
	let tagsData = CreateTags([], []);

	// add the tag to the tags array when the tag is added
	$('.tags').on('tagAdded', function(e, tag){
		tagsData.tags.push(tag);
	});

	// remove the tag from the tags array when the tag is removed
	$('.tags').on('tagRemoved', function(e, tag){		
		RemoveTag(tagsData.tags, tag);
	});

	$('.file').on('change', function(){
		for(i = 0; i < this.files.length; i++){
			const file  = this.files[i];
			const reader = new FileReader();
			const name = file.name;

			data.images.push(file);

			reader.addEventListener('load', function(e){
				const url = this.result;
				const video = isVideo(name);
				let media = '';
				if(video){
					media = '<video class="media" src="'+url+'" alt="Image Preview" class="imagePreview">';
				}else{
					media = '<img class="media" src="'+url+'" alt="Image Preview" class="imagePreview">';
				}
				
				var imageHtml = 
					`<span class="image">
						${media}
						<p class="remove">X</p>
					</span>`;

				var g = $("#gallery");
				$(imageHtml).insertBefore(g.children()[g.children().length-1]);

				$(".remove").on("click", function(e){
					const parent = $(this).parent();
					const index = $("#gallery").index(parent);
					data.images.splice(index, 1);
					parent.remove();
				});
			});
			reader.readAsDataURL(file);
		}
	});

	$('#upload').on('click', function(){

		if(data.images.length != 0)
		{
			var formData = new FormData();

			for (i = 0; i < data.images.length; i++) {
				formData.append("image", data.images[i]);
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
		}

	});
});