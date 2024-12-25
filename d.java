/* 2: setupActionListeners();
   3: connectToServer()
   3.1: global variable
   4: stream 구성 및 clientID 전송
   6: recvMsg 구현
   7: multi client 관리, parseMsg 구현
   8: 쪽지 보내기
   9: 채팅방 관리
   9.2: JoinRoom
   10: 데이터 전송
*/

package client;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.StringTokenizer;
import java.util.Vector;

import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.border.EmptyBorder;

public class Client10 extends JFrame implements ActionListener {

   // login GUI
   private JFrame loginGUI = new JFrame("Login");
   private JPanel loginJpanel;
   private JTextField serverIP_tf;
   private JTextField serverPort_tf;
   private JTextField clientID_tf;
   private JButton loginBtn;

   // global variable 3.1
   String serverIP;
   int serverPort;
   private String clientID; // 4

   // network 변수
   Socket socket; // 3.1
   private DataInputStream dis; // 4
   private DataOutputStream dos; // 4

   // main GUI
   private JPanel contentPane;
   private JButton noteBtn;
   private JTextArea chatArea;
   private JButton joinRoomBtn;
   private JButton createRoomBtn;
   private JList<String> roomJlist;
   private JList<String> clientJlist;
   private JTextField msg_tf;
   private JButton sendBtn;

   // 7: 클라이언트 관리
   private Vector<String> clientVC = new Vector<>();
   private Vector<String> roomClientVC = new Vector<>(); // 9: 채팅방에 가입한 client
   private String roomID = ""; // 9: 내가 참여한 채팅방
   private boolean createRoomRequest = false;

   // 7: 수신 메시지 프로토콜 검사
   StringTokenizer st;

   public Client10() {
      initLoginGUI();
      initMainGUI();
      setupActionListeners(); // 2
   }

   void initLoginGUI() {
      loginGUI.setLayout(null);
      loginGUI.setBounds(100, 100, 310, 341);
      loginJpanel = new JPanel();
      loginJpanel.setBorder(new EmptyBorder(5, 5, 5, 5));

      loginGUI.setContentPane(loginJpanel); // 1
      loginJpanel.setLayout(null);

      JLabel lblNewLabel = new JLabel("서버 IP");
      lblNewLabel.setBounds(12, 31, 50, 15);
      loginJpanel.add(lblNewLabel);

      serverIP_tf = new JTextField();
      serverIP_tf.setBounds(109, 25, 164, 21);
      loginJpanel.add(serverIP_tf);
      serverIP_tf.setColumns(10);

      JLabel lblPort = new JLabel("서버 port");
      lblPort.setBounds(12, 82, 50, 15);
      loginJpanel.add(lblPort);

      serverPort_tf = new JTextField();
      serverPort_tf.setColumns(10);
      serverPort_tf.setBounds(109, 76, 164, 21);
      loginJpanel.add(serverPort_tf);

      clientID_tf = new JTextField();
      clientID_tf.setColumns(10);
      clientID_tf.setBounds(109, 126, 164, 21);
      loginGUI.add(clientID_tf);

      JLabel lblId = new JLabel("클라이언트 ID");
      lblId.setBounds(12, 132, 85, 15);
      loginJpanel.add(lblId);

      loginBtn = new JButton("로그인");
      loginBtn.setBounds(12, 174, 261, 23);
      loginJpanel.add(loginBtn);

      loginGUI.setVisible(true);
   }

   void initMainGUI() {
      setBounds(400, 100, 500, 445);
      setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

      contentPane = new JPanel();
      contentPane.setBorder(new EmptyBorder(5, 5, 5, 5));
      setContentPane(contentPane);
      contentPane.setLayout(null);

      JLabel lblNewLabel = new JLabel("현재 접속자");
      lblNewLabel.setBounds(12, 10, 87, 15);
      contentPane.add(lblNewLabel);

      roomJlist = new JList();
      roomJlist.setBounds(12, 222, 118, 112);
      contentPane.add(roomJlist);

      noteBtn = new JButton("쪽지 전송");
      noteBtn.setBounds(12, 156, 118, 23);
      contentPane.add(noteBtn);

      JLabel lblNewLabel_1 = new JLabel("채팅방목록");
      lblNewLabel_1.setBounds(12, 197, 87, 15);
      contentPane.add(lblNewLabel_1);

      clientJlist = new JList();
      clientJlist.setBounds(12, 35, 118, 112);
      contentPane.add(clientJlist);

      createRoomBtn = new JButton("방만들");
      createRoomBtn.setBounds(12, 375, 118, 23);
      contentPane.add(createRoomBtn);

      joinRoomBtn = new JButton("채팅방참여");
      joinRoomBtn.setBounds(12, 344, 118, 23);
      contentPane.add(joinRoomBtn);

      chatArea = new JTextArea();
      chatArea.setBounds(138, 5, 336, 359);
      contentPane.add(chatArea);

      msg_tf = new JTextField();
      msg_tf.setBounds(138, 376, 267, 21);
      contentPane.add(msg_tf);
      msg_tf.setColumns(10);

      sendBtn = new JButton("전송");
      sendBtn.setBounds(410, 375, 64, 23);
      contentPane.add(sendBtn);

      this.setVisible(true);
   }

   public void setupActionListeners() { // 2
      loginBtn.addActionListener(this);
      noteBtn.addActionListener(this);
      joinRoomBtn.addActionListener(this);
      createRoomBtn.addActionListener(this);
      sendBtn.addActionListener(this);
   };

   @Override
   public void actionPerformed(ActionEvent e) { // 2
      // TODO Auto-generated method stub
      if (e.getSource() == loginBtn) {
         System.out.println("서버 접속");
         connectToServer(); // 3
      } else if (e.getSource() == noteBtn) {
         System.out.println("쪽지 보내기");
         handleNoteSendButtonClick(); // 8
      } else if (e.getSource() == createRoomBtn) { // 9
         System.out.println("채팅방 생성");
         handleCreateRoomButtonClick();
      } else if (e.getSource() == joinRoomBtn) {
         System.out.println("채팅방 가입");
         handleJoinRoomButtonClick();

      } else if (e.getSource() == sendBtn) {
         System.out.println("메시지 전송");
         handleSendButtonClick(); // 10: 데이터 전송
      }

   }

   public void connectToServer() { // 3
      serverIP = serverIP_tf.getText().trim();
      serverPort = Integer.parseInt(serverPort_tf.getText().trim());
      try {
         socket = new Socket(serverIP, serverPort);
         System.out.println("서버에 연결 성공");

         // 4 clientID 전송
         dis = new DataInputStream(socket.getInputStream());
         dos = new DataOutputStream(socket.getOutputStream());

      } catch (UnknownHostException e) {
         JOptionPane.showMessageDialog(this, "잘못된 호스트 주소 포트 번호 입니다.", "오류", JOptionPane.ERROR_MESSAGE);
      } catch (IOException e) {
         JOptionPane.showMessageDialog(this, "서저에 연결할 수 없습니다.", "오류", JOptionPane.ERROR_MESSAGE);
      }

      clientID = clientID_tf.getText().trim();
      sendMsg(clientID); // 6

      clientVC.add(clientID); // 7: 자신 먼저 vector 에 등록
      clientJlist.setListData(clientVC); // 7: // JLIST로 화면에 출력.
      setTitle("사용자: " + clientID);// 타이틀 업데이트 //9.4

      // 6: recvMsg 구현
      new Thread(new Runnable() {
         @Override
         public void run() {
            while (true) {
               try {
                  String msg = dis.readUTF();
                  System.out.println("서버로부터 수신한 메시지 : " + msg);
                  parseMsg(msg); // 7: 수신한 메시지 프로토콜 처리
               } catch (IOException e) {
                  // TODO Auto-generated catch block
                  e.printStackTrace();
               }
            }
         }
      }).start();
   }

   // 8: 쪽지 보내기
   public void handleNoteSendButtonClick() {
      String dstClient = (String) clientJlist.getSelectedValue();

      String note = JOptionPane.showInputDialog(this, dstClient + "로 전송할 쪽지", "전송할 쪽지 내용", JOptionPane.PLAIN_MESSAGE);
      if (note != null) {
         sendMsg("Note/" + dstClient + "/" + note);
         System.out.println("receiver: " + dstClient + " | 전송 노트: " + note);
      }
   }

   // 9: 채팅방 만들기 요청
   public void handleCreateRoomButtonClick() {
      String roomID = JOptionPane.showInputDialog("Enter Room ID:");
      sendMsg("CreateRoom/" + roomID.trim());
      createRoomRequest = true;
   }

   // 9.2: 채팅방 가입 요청
   public void handleJoinRoomButtonClick() {
      String roomID = (String) roomJlist.getSelectedValue();
      sendMsg("JoinRoom/" + roomID.trim());
   }

   // 10: 데이터 전송
   public void handleSendButtonClick() {  //10.1
      System.out.println("ChatMsg/" + roomID + "/" + msg_tf.getText().trim());
      sendMsg("ChatMsg/" + roomID + "/" + msg_tf.getText().trim());
      msg_tf.setText(""); // ** Clear input field after sending.
      msg_tf.requestFocus(); // ** Set focus back to input field.
   }

   // 6: sendMsg, recvMsg 구현
   void sendMsg(String msg) {
      try {
         dos.writeUTF(msg);
      } catch (IOException e) {
         JOptionPane.showMessageDialog(this, "메시지 전송 중 오류가 발생했습니다.", "오류", JOptionPane.ERROR_MESSAGE);// ** Improved
         // clarity.
      }
   }

   // 7: 수신한 메시지 프로토콜 처리
   public void parseMsg(String msg) {
      st = new StringTokenizer(msg, "/");
      String protocol = st.nextToken();
      String message = st.nextToken();
      System.out.println("프로토콜 : " + protocol);
      System.out.println("내용 : " + message);
      if (protocol.equals("NewClient")) {
         clientVC.add(message); // Message == clientID
         clientJlist.setListData(clientVC);
      } else if (protocol.equals("OldClient")) {
         clientVC.add(message); // Message == clientID
         clientJlist.setListData(clientVC);
      } else if (protocol.equals("Note")) { // 8: 쪽지 보내기
         String noteSenderId = message;
         String note = st.nextToken();
         JOptionPane.showMessageDialog(this, note, noteSenderId + "가 전송한 쪽지", JOptionPane.PLAIN_MESSAGE);
      } else if (protocol.equals("NewRoom")) { // 9 채팅방 관리
         String roomID = message; // 지역 변수
         if (createRoomRequest == true) {
            joinNewRoom(message);
            createRoomRequest = false;
         }
         handleAddRoomJlist(roomID);
      } else if (protocol.equals("OldRoom")) { // 9.1 새로 가입한 client에게 기존 채팅방 전송
         String roomID = message; // 지역 변수
         handleAddRoomJlist(roomID);
      } else if (protocol.equals("JoinRoom")) { // 9.2 JoinRoom요청한 client에게 결과 전송
         String roomID = message; // 지역 변수
         handleJoinRoom(roomID);
      } else if (protocol.equals("JoinRoomMsg")) { // 9.3 JoinRoom요청한 client에게 결과 전송
         String clientID = message; // 지역 변수
         String welcome = st.nextToken();
         chatArea.append(clientID + ": " + welcome + "\n"); // 9.2 메시지 추가.
      } else if (protocol.equals("ChatMsg")) { // 10. 채팅 메시지 수신  10.4
         String chatMsg = st.nextToken();
         chatArea.append(message + "님이 전송: " + chatMsg + "\n");// 메시지 추가.
      }
   }

   // 9:채팅방 추가
   private void handleAddRoomJlist(String roomID) {
      roomClientVC.add(roomID);// 방 이름 추가.
      roomJlist.setListData(roomClientVC);// 방 목록 업데이트.
   }

   // 9: 채팅방 생성 요구 결과로 생성된 채팅방에 자신이 가입
   public void joinNewRoom(String roomID) {
      this.roomID = roomID;// 현재 방 이름 설정.
      setTitle("사용자: " + clientID + " 채팅방: " + roomID);// 타이틀 업데이트
      chatArea.append(clientID + "님이 " + roomID + " 생성 및 가입\n");// 채팅창에 알림 추가.
   }

   private void handleJoinRoom(String roomID) {
      this.roomID = roomID;
      setTitle("사용자: " + clientID + " 채팅방: " + roomID);// 타이틀 업데이트 //9.4
      // chatArea.append(clientID+"님이 "+roomID+"가입\n");// 채팅창에 알림 추가
   }

   public static void main(String[] args) {
      new Client10();

   }
}
