/**
 * PublishingCalendar Component
 * Displays scheduled posts in a calendar view
 */

import { useState } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June",
                 "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PublishingCalendar({ posts, onDateSelect, isLoading }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [postsOnSelectedDate, setPostsOnSelectedDate] = useState([]);

  // Generate calendar days
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Get posts for a specific date
  const getPostsForDate = (day) => {
    if (!day) return [];
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    targetDate.setHours(0, 0, 0, 0);

    return posts.filter(post => {
      const postDate = new Date(post.scheduled_time);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === targetDate.getTime();
    });
  };

  // Handle date selection
  const handleDayClick = (day) => {
    if (!day) return;
    
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selected);
    setPostsOnSelectedDate(getPostsForDate(day));
    
    if (onDateSelect) {
      onDateSelect(selected);
    }
  };

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="publishing-calendar card">
      <div className="calendar-header">
        <h3>Publishing Calendar</h3>
        <div className="calendar-nav">
          <button onClick={handlePrevMonth}>&lt;</button>
          <span className="calendar-month-year">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={handleNextMonth}>&gt;</button>
        </div>
      </div>

      <div className="calendar-body">
        {isLoading && <p className="calendar-loading">Loading posts...</p>}
        <div className="calendar-weekdays">
          {DAYS.map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            const dayPosts = day ? getPostsForDate(day) : [];
            const isSelected = selectedDate && day === selectedDate.getDate() &&
                              selectedDate.getMonth() === currentDate.getMonth();

            return (
              <div
                key={index}
                className={`calendar-day ${day ? 'active' : 'empty'} ${isSelected ? 'selected' : ''} ${dayPosts.length > 0 ? 'has-posts' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {day && (
                  <>
                    <span className="day-number">{day}</span>
                    {dayPosts.length > 0 && (
                      <div className="day-post-indicator">
                        <span className="post-count">{dayPosts.length}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="calendar-selected-posts">
          <h4>Posts on {selectedDate.toLocaleDateString()}</h4>
          {postsOnSelectedDate.length > 0 ? (
            <div className="posts-list">
              {postsOnSelectedDate.map(post => (
                <div key={post.id} className="post-item">
                  <div className="post-time">
                    {new Date(post.scheduled_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="post-platform">{post.platform}</div>
                  <div className="post-preview">{post.content.substring(0, 50)}...</div>
                  <div className="post-status">{post.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-posts">No posts scheduled for this date</p>
          )}
        </div>
      )}
    </div>
  );
}
