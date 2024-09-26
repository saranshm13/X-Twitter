var typing = false;
var lastTypingTime;

$(document).ready(() => {

    socket.emit("join room", chatId);
    socket.on("typing" , () => $(".typingDots").show());
    socket.on("stop typing", () => $(".typingDots").hide());
;
    $.get(`/api/chats/${chatId}` , (data) => $('#chatName').text(getChatName(data)))

    $.get(`/api/chats/${chatId}/messages`, (data) => {
        var messages = [];
        var prevSenderId = "";

        data.forEach((message, index) => {
            var html = createMessageHtml(message, data[index+1] , prevSenderId);
            messages.push(html);

            prevSenderId = message.sender._id;
        })

        var messageHtml = messages.join("");
        addMessagesHtmlToPage(messageHtml);
        scrollToBottom(false);
        markAllMessagesAsRead();

        $(".loadingSpinnerContainer").remove();
        $(".chatContainer").css("visibility", "visible");
    })
})

$("#chatNameButton").click(()=> {
    var name = $("#chatNameTextbox").val().trim();
    
    $.ajax({
        url: "/api/chats/" + chatId,
        type: "PUT",
        data: {chatName: name},
        success: (data, status, xhr) => {
            if(xhr.status != 204) {
                alert("not updated")
            }
            else {
                location.reload();
            }
        }
    })
})

$(".sendMessageButton").click( () => {
    messageSubmitted();
})

$(".inputTextbox").keydown((event) => {

    updateTyping()

    if(event.which === 13) {
        messageSubmitted();
        return false; 
    }
})

function updateTyping() {
    if(!connected) return;

    if(!typing) {
        typing = true;
        socket.emit("typing" , chatId);
    }

    lastTypingTime = new Date().getTime();
    var timerLength = 3000;

    setTimeout(() => {
        var timeNow = new Date().getTime();
        var timeDiff = timeNow - lastTypingTime;

        if(timeDiff >= timerLength && typing) {
            socket.emit("stop typing" , chatId);
            typing = false;
        }

    }, timerLength)

}

function addMessagesHtmlToPage(html) {
    $(".chatMessages").append(html);
}

function messageSubmitted() {
    var content = $(".inputTextbox").val().trim();

    if(content != "") {
        sendMessage(content);
        $(".inputTextbox").val("");
        socket.emit("stop typing" , chatId);
        typing = false;
    }
}

function sendMessage(content) {
    $.post("/api/messages", {content: content, chatId: chatId } , (data, status, xhr) => {
        if(xhr.status != 201) {
            alert("Could not send message");
            $(".inputTextBox").val(content);
            return;
        }

        addChatMessageHtml(data);

        if(connected) {
            socket.emit("new message", data);
        }
    })
}

function addChatMessageHtml(message) {
    if(!message || !message._id) {
        alert("Invalid message output");
        return;
    }
    
    var messageDiv = createMessageHtml(message, null, "");

    addMessagesHtmlToPage(messageDiv)
    scrollToBottom(true);

}

function createMessageHtml(message, nextMessage, prevSenderId) {
    var sender = message.sender; 
    var senderName = sender.firstName + " " + sender.lastName;

    var currentSenderId = sender._id;
    var nextSenderId = nextMessage != null ? nextMessage.sender._id : "";

    var isFirst = prevSenderId != currentSenderId;
    var isLast = nextSenderId != currentSenderId;

    var isMine = message.sender._id == userLoggedIn._id;
    var liClassName = isMine ? "mine" : "theirs"

    var nameElement = "";
    var profileImage = "";

    if(isFirst) {
        liClassName += " first";

        if(!isMine) {
            nameElement = `<span class = 'senderName'>${senderName}</span>`
        }
    }

    if(isLast) {
        liClassName += " last";
        profileImage =  `<img src=${sender.profilePic}>`;
    }

    var imageContainer = "";
    if(!isMine) {
        imageContainer = `<div class='imageContainer'>
                                ${profileImage}
                          </div>`
    }

    return `<li class='message ${liClassName}'>
                ${imageContainer}
                <div class='messageContainer'>
                    ${nameElement}
                    <span class='messageBody'>
                        ${message.content}
                    </span>
                </div>
            </li>`;
}

function scrollToBottom(animated) {
    var container = $(".chatMessages");
    var scrollHeight = container[0].scrollHeight;

    if(animated) {
        container.animate({ scrollTop: scrollHeight }, "slow" )
    }
    else {
        container.scrollTop(scrollHeight)
    }
}

function markAllMessagesAsRead() {
    $.ajax( {
        url: `/api/chats/${chatId}/messages/markAsRead`,
        type: "PUT",
        success: () => refreshMessagesBadge()
    })
}