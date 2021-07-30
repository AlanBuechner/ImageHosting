$(document).ready(function(){
	
});

function CreateTags(startTags, noDelete)
{
	tagData = {
		tags: startTags,
		noDelete: noDelete,
		updateTags: function(tags)
		{

			function genTagHtml(tag, canDelete){
				let html = '';
				html += `<div class="tag ${canDelete?"sidebutton":""}">`
				html +=		`<p class="tagName">${tag}</p>`
				if(canDelete){
					html +=		`<figure class="tag_btn remove_btn"><img src="public/minus.png"></figure>`
				}
				html +=	`</div>`;
				return html;
			}
		
			var tagshtml = '';
			for(i = 0; i < tags.length; i++){
				let canDelete = noDelete.indexOf(tags[i])==-1;
				if(canDelete)
					tagshtml += genTagHtml(tags[i], canDelete);
				else
					tagshtml = genTagHtml(tags[i], canDelete) + tagshtml;
			}
		
			tagshtml += `<div class="tag sidebutton">
							<form class="newTag"><input type="text" id="input"></input></form>
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
				$('.tags').trigger('tagRemoved', tag);
				tagData.updateTags(tags);
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
		
						if(!tags.find(e => e == tag)){
		
							$('.tags').trigger('tagAdded', tag);
						}
						// update window
						tagData.updateTags(tags);
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
				const tag = $(this).html();
				$('.tags').trigger("tagClicked", tag);
			});
		}
	}

	tagData.updateTags(startTags);

	return tagData;
}

// tag controles
function RemoveTag(tags, tag)
{
	const index = tags.indexOf(tag);
	tags.splice(index, 1);
}