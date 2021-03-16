import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: `
      {
        post(postId: "${postId}") {
          title
          content
          imageUrl
          creator {
            name
          }
          createdAt
        }
      }
      `
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        console.log(resData)
        const {errors,  data: { post: { title, content, creator: { name }, createdAt, imageUrl } } } = resData
        if (errors && errors[0].status === 422) {
          throw new Error(
            "Validation failed. Make sure the email address isn't used yet!"
          );
        }
        if(errors){
          throw new Error('something went wrong')
        }
        this.setState({
          title: title,
          author: name,
          image: 'http://localhost:8080/' + imageUrl,
          date: new Date(createdAt).toLocaleDateString('en-US'),
          content: content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
